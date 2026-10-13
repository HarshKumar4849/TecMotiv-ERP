const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { ROLES, normalizeRole } = require('../../../rbac/roles');

const documentController = {
  // ==========================================
  // UPLOAD / CREATE DOCUMENT
  // ==========================================
  create: async (req, res) => {
    const Document = mongoose.model('Document');
    const Employee = mongoose.model('Employee');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'No file uploaded. Please attach a valid document file.',
      });
    }

    if (req.file.size === 0) {
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Empty files are not permitted.',
      });
    }

    const fileBytes = fs.readFileSync(req.file.path);
    const signatures = {
      'application/pdf': fileBytes.subarray(0, 5).toString() === '%PDF-',
      'image/jpeg': fileBytes[0] === 0xff && fileBytes[1] === 0xd8 && fileBytes[2] === 0xff,
      'image/png': fileBytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'image/webp': fileBytes.subarray(0, 4).toString() === 'RIFF' && fileBytes.subarray(8, 12).toString() === 'WEBP',
      'application/msword': fileBytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': fileBytes.subarray(0, 2).toString() === 'PK',
    };
    if (!signatures[req.file.mimetype]) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ success: false, result: null, message: 'File content does not match its declared type.' });
    }

    const {
      employee: empInput,
      documentType,
      issueDate,
      expiryDate,
      remarks,
    } = req.body;

    if (!empInput || !documentType) {
      // remove uploaded file if validation fails
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Employee and Document Type are required fields.',
      });
    }

    // Resolve employee
    let empRecord;
    if (mongoose.Types.ObjectId.isValid(empInput)) {
      empRecord = await Employee.findOne({ _id: empInput, removed: false });
    }
    if (!empRecord) {
      empRecord = await Employee.findOne({ employeeId: empInput.toUpperCase(), removed: false });
    }

    if (!empRecord) {
      if (req.file && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Employee record not found.',
      });
    }

    const user = req.user || req.admin;
    if (user && normalizeRole(user.role) !== ROLES.ADMIN) {
      const ownEmployee = await Employee.findOne({ user: user._id, removed: false });
      if (!ownEmployee) {
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(400).json({
          success: false,
          result: null,
          message: 'No associated employee profile found for user account.',
        });
      }
      // Multipart fields are parsed after RBAC middleware. Enforce ownership
      // here as the final authority and never trust client employee IDs.
      empRecord = ownEmployee;
    }
    const uploadedByName = user ? `${user.name || ''} ${user.surname || ''}`.trim() : 'System';

    const docData = {
      employee: empRecord._id,
      employeeId: empRecord.employeeId,
      employeeName: `${empRecord.name || ''} ${empRecord.surname || ''}`.trim(),
      documentType,
      file: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path.replace(/\\/g, '/'),
        mimeType: req.file.mimetype,
        size: req.file.size,
      },
      issueDate: issueDate ? new Date(issueDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      remarks: remarks || '',
      verificationStatus: 'Pending',
      uploadedBy: user ? user._id : empRecord.user,
      uploadedByName,
      uploadedAt: Date.now(),
    };

    const newDoc = new Document(docData);
    const saved = await newDoc.save();

    const populated = await Document.findById(saved._id)
      .populate('employee', 'name surname employeeId departmentName designationName photo email')
      .populate('uploadedBy', 'name surname email');

    return res.status(200).json({
      success: true,
      result: populated,
      message: 'Document uploaded to Vault successfully.',
    });
  },

  // ==========================================
  // READ DOCUMENT METADATA
  // ==========================================
  read: async (req, res) => {
    const Document = mongoose.model('Document');
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid document id.',
      });
    }

    const doc = await Document.findOne({ _id: id, removed: false })
      .populate('employee', 'name surname employeeId departmentName designationName photo email')
      .populate('uploadedBy', 'name surname email')
      .populate('verifiedBy', 'name surname email');

    if (!doc) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Document not found.',
      });
    }

    return res.status(200).json({
      success: true,
      result: doc,
      message: 'Document retrieved successfully.',
    });
  },

  // ==========================================
  // SECURE DOWNLOAD / VIEW (NEVER EXPOSE RAW URLS)
  // ==========================================
  download: async (req, res) => {
    const Document = mongoose.model('Document');
    const { id } = req.params;
    const mode = req.query.mode === 'inline' ? 'inline' : 'attachment';

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid document id.',
      });
    }

    const doc = await Document.findOne({ _id: id, removed: false });
    if (!doc || !doc.file || !doc.file.path) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Document file not found.',
      });
    }

    const filePath = path.resolve(doc.file.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Storage file was moved or is missing from disk.',
      });
    }

    res.setHeader('Content-Type', doc.file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${mode}; filename="${encodeURIComponent(doc.file.originalName)}"`
    );
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  },

  // ==========================================
  // VERIFY DOCUMENT (ADMIN ONLY)
  // ==========================================
  verify: async (req, res) => {
    const Document = mongoose.model('Document');
    const { id } = req.params;
    const { verificationStatus, verificationRemarks } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid document id.',
      });
    }

    const validStatuses = ['Pending', 'Verified', 'Rejected'];
    if (!validStatuses.includes(verificationStatus)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const user = req.user || req.admin;
    const verifiedByName = user ? `${user.name || ''} ${user.surname || ''}`.trim() : 'Administrator';

    const updateData = {
      verificationStatus,
      verificationRemarks: verificationRemarks || '',
      verifiedBy: user ? user._id : null,
      verifiedByName,
      verifiedAt: Date.now(),
      updated: Date.now(),
    };

    const updated = await Document.findByIdAndUpdate(id, updateData, { new: true })
      .populate('employee', 'name surname employeeId departmentName designationName photo email')
      .populate('uploadedBy', 'name surname email')
      .populate('verifiedBy', 'name surname email');

    if (!updated) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Document not found.',
      });
    }

    return res.status(200).json({
      success: true,
      result: updated,
      message: `Document marked as '${verificationStatus}'.`,
    });
  },

  // ==========================================
  // UPDATE DOCUMENT METADATA
  // ==========================================
  update: async (req, res) => {
    const Document = mongoose.model('Document');
    const { id } = req.params;
    const { issueDate, expiryDate, remarks, documentType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid document id.',
      });
    }

    const updateData = { updated: Date.now() };
    if (issueDate !== undefined) updateData.issueDate = issueDate ? new Date(issueDate) : null;
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (documentType !== undefined) updateData.documentType = documentType;

    const updated = await Document.findByIdAndUpdate(id, updateData, { new: true })
      .populate('employee', 'name surname employeeId departmentName designationName photo email')
      .populate('uploadedBy', 'name surname email');

    if (!updated) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Document not found.',
      });
    }

    return res.status(200).json({
      success: true,
      result: updated,
      message: 'Document details updated.',
    });
  },

  // ==========================================
  // DELETE (SOFT DELETE) DOCUMENT
  // ==========================================
  delete: async (req, res) => {
    const Document = mongoose.model('Document');
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'Invalid document id.',
      });
    }

    const doc = await Document.findByIdAndUpdate(
      id,
      { removed: true, enabled: false, updated: Date.now() },
      { new: true }
    );

    if (!doc) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Document not found.',
      });
    }

    return res.status(200).json({
      success: true,
      result: doc,
      message: 'Document removed from vault.',
    });
  },

  // ==========================================
  // LIST DOCUMENTS (PAGINATED + FILTERS + SEARCH)
  // ==========================================
  list: async (req, res) => {
    const Document = mongoose.model('Document');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.items) || 10;
    const skip = (page - 1) * limit;

    const {
      q,
      employee,
      documentType,
      verificationStatus,
      expiryStatus,
      sortBy = 'uploadedAt',
      sortValue = -1,
    } = req.query;

    const filterConditions = { removed: false };

    // Employee filter
    if (employee && employee !== 'all') {
      if (mongoose.Types.ObjectId.isValid(employee)) {
        filterConditions.employee = employee;
      } else {
        filterConditions.$or = [
          { employeeId: new RegExp(`^${employee}$`, 'i') },
          { employeeName: new RegExp(employee, 'i') },
        ];
      }
    }

    // Document Type filter
    if (documentType && documentType !== 'all') {
      filterConditions.documentType = documentType;
    }

    // Verification Status filter
    if (verificationStatus && verificationStatus !== 'all') {
      filterConditions.verificationStatus = verificationStatus;
    }

    // Expiry Status filter
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (expiryStatus === 'expired') {
      filterConditions.expiryDate = { $lt: now };
    } else if (expiryStatus === 'expiring_soon') {
      filterConditions.expiryDate = { $gte: now, $lte: thirtyDaysFromNow };
    } else if (expiryStatus === 'valid') {
      filterConditions.$or = [
        { expiryDate: null },
        { expiryDate: { $gt: thirtyDaysFromNow } },
      ];
    }

    // Search query
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filterConditions.$or = [
        { employeeName: regex },
        { employeeId: regex },
        { documentType: regex },
        { 'file.originalName': regex },
        { remarks: regex },
      ];
    }

    const sortOrder = parseInt(sortValue) || -1;
    const sortField = sortBy || 'uploadedAt';

    const [result, count] = await Promise.all([
      Document.find(filterConditions)
        .skip(skip)
        .limit(limit)
        .sort({ [sortField]: sortOrder })
        .populate('employee', 'name surname employeeId departmentName designationName photo email')
        .populate('uploadedBy', 'name surname email')
        .populate('verifiedBy', 'name surname email')
        .exec(),
      Document.countDocuments(filterConditions),
    ]);

    const pages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      result,
      pagination: {
        page,
        pages,
        count,
      },
      message: 'Documents retrieved successfully.',
    });
  },

  // ==========================================
  // SEARCH QUICK ENDPOINT
  // ==========================================
  search: async (req, res) => {
    return documentController.list(req, res);
  },

  // ==========================================
  // FILTER ENDPOINT
  // ==========================================
  filter: async (req, res) => {
    return documentController.list(req, res);
  },

  // ==========================================
  // VAULT SUMMARY STATS & EXPIRY TRACKING
  // ==========================================
  summary: async (req, res) => {
    const Document = mongoose.model('Document');
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const matchConditions = { removed: false };
    if (req.query.employee && req.query.employee !== 'all') {
      if (mongoose.Types.ObjectId.isValid(req.query.employee)) {
        matchConditions.employee = new mongoose.Types.ObjectId(req.query.employee);
      }
    }

    const [total, verified, pending, rejected, expired, expiringSoon, typeAggregation] =
      await Promise.all([
        Document.countDocuments(matchConditions),
        Document.countDocuments({ ...matchConditions, verificationStatus: 'Verified' }),
        Document.countDocuments({ ...matchConditions, verificationStatus: 'Pending' }),
        Document.countDocuments({ ...matchConditions, verificationStatus: 'Rejected' }),
        Document.countDocuments({ ...matchConditions, expiryDate: { $lt: now } }),
        Document.countDocuments({
          ...matchConditions,
          expiryDate: { $gte: now, $lte: thirtyDaysFromNow },
        }),
        Document.aggregate([
          { $match: matchConditions },
          { $group: { _id: '$documentType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

    return res.status(200).json({
      success: true,
      result: {
        total,
        verified,
        pending,
        rejected,
        expired,
        expiringSoon,
        byType: typeAggregation.map((t) => ({ type: t._id, count: t.count })),
      },
      message: 'Document vault summary statistics calculated.',
    });
  },
};

module.exports = documentController;
