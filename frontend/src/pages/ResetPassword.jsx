import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router-dom';

import { resetPassword } from '@/redux/auth/actions';
import { selectAuth } from '@/redux/auth/selectors';

import { Form, Button } from 'antd';

import ResetPasswordForm from '@/forms/ResetPasswordForm';

import useLanguage from '@/locale/useLanguage';

import Loading from '@/components/Loading';
import AuthModule from '@/modules/AuthModule';

const ResetPassword = () => {
  const translate = useLanguage();
  const { isLoading } = useSelector(selectAuth);
  const navigate = useNavigate();
  const { userId, resetToken } = useParams();

  const dispatch = useDispatch();
  const onFinish = async (values) => {
    const targetUserId = userId || values.userId;
    const targetResetToken = resetToken || values.resetToken;

    const result = await dispatch(
      resetPassword({
        resetPasswordData: {
          password: values.password,
          userId: targetUserId,
          resetToken: targetResetToken,
        },
      })
    );
    if (result?.success) navigate('/login');
  };

  const hasUrlTokens = Boolean(userId && resetToken);

  const FormContainer = () => {
    return (
      <Loading isLoading={isLoading}>
        <Form
          name="signup"
          className="login-form"
          initialValues={{
            remember: true,
          }}
          onFinish={onFinish}
        >
          <ResetPasswordForm hasUrlTokens={hasUrlTokens} />
          <Form.Item>
            <Button type="primary" htmlType="submit" className="login-form-button" size="large">
              {translate('update password')}
            </Button>
            {translate('Or')} <Link to="/login"> {translate('already have account Login')} </Link>
          </Form.Item>
        </Form>
      </Loading>
    );
  };
  return <AuthModule authContent={<FormContainer />} AUTH_TITLE="Reset Password" />;
};

export default ResetPassword;
