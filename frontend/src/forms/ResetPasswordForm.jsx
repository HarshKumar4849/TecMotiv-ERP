import React from 'react';
import { Form, Input } from 'antd';
import { LockOutlined } from '@ant-design/icons';

export default function ResetPasswordForm() {
  return (
    <>
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
          placeholder="Password"
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
          placeholder="Confirm password"
          aria-label="Confirm new password"
          size="large"
        />
      </Form.Item>
    </>
  );
}
