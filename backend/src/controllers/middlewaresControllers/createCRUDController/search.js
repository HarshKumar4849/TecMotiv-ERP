const { buildScopeFilter } = require('./scopeFilter');

const search = async (Model, req, res) => {
  const escapeRegex = (text) => (typeof text === 'string' ? text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '');
  const fieldsArray = req.query.fields ? req.query.fields.split(',') : ['name'];

  const fields = { $or: [] };
  const sanitizedQuery = escapeRegex(req.query.q || '');

  for (const field of fieldsArray) {
    fields.$or.push({ [field]: { $regex: new RegExp(sanitizedQuery, 'i') } });
  }

  // Enforce the RBAC access scope (ownership / department constraints
  // set by rbacMiddleware) so search never leaks records the caller is
  // not allowed to see.
  const scopeCondition = buildScopeFilter(Model, req);

  let results = await Model.find({
    ...scopeCondition,
    ...fields,
  })

    .where('removed', false)
    .limit(20)
    .exec();

  if (results.length >= 1) {
    return res.status(200).json({
      success: true,
      result: results,
      message: 'Successfully found all documents',
    });
  } else {
    return res
      .status(202)
      .json({
        success: false,
        result: [],
        message: 'No document found by this request',
      })
      .end();
  }
};

module.exports = search;
