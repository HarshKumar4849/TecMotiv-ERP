import React from 'react';
import { Form, Input } from 'antd';
import { LockOutlined, UserOutlined, KeyOutlined } from '@ant-design/icons';

export default function ResetPasswordForm({ hasUrlTokens = true }) {
  return (
    <>
      {!hasUrlTokens && (
        <>
          <Form.Item
            name="userId"
            rules={[{ required: true, message: 'Please enter your User ID from the reset email/link.' }]}
          >
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              placeholder="User ID (from reset link)"
              aria-label="User ID"
              size="large"
            />
          </Form.Item>
          <Form.Item
            name="resetToken"
            rules={[{ required: true, message: 'Please enter your 64-character Reset Token.' }]}
          >
            <Input
              prefix={<KeyOutlined className="site-form-item-icon" />}
              placeholder="Reset Token (from email)"
              aria-label="Reset Token"
              size="large"
            />
          </Form.Item>
        </>
      )}
      <Form.Item
        name="password"
        rules={[
          {
            required: true,
          },
          { min: 12, message: 'Use at least 12 characters.' },
          { max: 128, message: 'Use no more than 128 characters.' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="site-form-item-icon" />}
          placeholder="New Password (min 12 chars)"
          aria-label="New password"
          size="large"
        />
      </Form.Item>
      <Form.Item
        name="confirm_password"
        rules={[
          {
            required: true,
          },
          { min: 12, message: 'Use at least 12 characters.' },
          { max: 128, message: 'Use no more than 128 characters.' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('The two passwords that you entered do not match!'));
            },
          }),
        ]}
        hasFeedback
      >
        <Input.Password
          prefix={<LockOutlined className="site-form-item-icon" />}
          placeholder="Confirm new password"
          aria-label="Confirm new password"
          size="large"
        />
      </Form.Item>
    </>
  );
}
