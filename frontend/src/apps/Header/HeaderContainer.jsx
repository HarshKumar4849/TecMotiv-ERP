import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Layout, Tag, Space, Badge, Button, Tooltip } from 'antd';
import {
  LogoutOutlined,
  ToolOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  ApartmentOutlined,
  BellOutlined,
} from '@ant-design/icons';

import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { FILE_BASE_URL } from '@/config/serverApiConfig';
import useLanguage from '@/locale/useLanguage';
import { canAccessModule, normalizeRole, ROLES } from '@/utils/rbac';
import { request } from '@/request';
import { NotificationCenterDrawer } from '@/modules/NotificationModule';

export default function HeaderContent() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const { Header } = Layout;

  const translate = useLanguage();
  const rawRole = currentAdmin?.role || 'EMPLOYEE';
  const role = normalizeRole(rawRole);

  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  const fetchUnreadCount = async () => {
    try {
      const res = await request.get({ entity: 'notification/unread-count' });
      if (res && res.success && res.result) {
        setUnreadCount(res.result.count || 0);
      }
    } catch (e) {
      // quiet catch
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRoleColor = (r) => {
    switch (normalizeRole(r)) {
      case ROLES.ADMIN:
        return 'purple';
      case ROLES.HR:
        return 'magenta';
      case ROLES.EMPLOYEE:
      default:
        return 'blue';
    }
  };

  const ProfileDropdown = () => {
    const navigate = useNavigate();
    return (
      <div className="profileDropdown" onClick={() => navigate('/profile')}>
        <Avatar
          size="large"
          className="last"
          src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
          style={{
            color: '#1677ff',
            backgroundColor: currentAdmin?.photo ? 'none' : '#e6f4ff',
            boxShadow: 'rgba(22, 119, 255, 0.2) 0px 0px 6px 1px',
          }}
        >
          {currentAdmin?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
        <div className="profileDropdownInfo">
          <p style={{ fontWeight: 600 }}>
            {currentAdmin?.name} {currentAdmin?.surname}
          </p>
          <p style={{ fontSize: 12, color: '#8c8c8c' }}>{currentAdmin?.email}</p>
        </div>
      </div>
    );
  };

  const DropdownMenu = ({ text }) => {
    return <span>{text}</span>;
  };

  const items = [
    {
      label: <ProfileDropdown className="headerDropDownMenu" />,
      key: 'ProfileDropdown',
    },
    {
      type: 'divider',
    },
    {
      icon: <UserOutlined />,
      key: 'settingProfile',
      label: (
        <Link to={'/profile'}>
          <DropdownMenu text={translate('profile_settings')} />
        </Link>
      ),
    },
    ...(canAccessModule(role, 'admin')
      ? [
          {
            icon: <SafetyCertificateOutlined />,
            key: 'adminPanel',
            label: <Link to={'/admin'}>{translate('Admin Panel')}</Link>,
          },
        ]
      : []),
    ...(canAccessModule(role, 'settings')
      ? [
          {
            icon: <ToolOutlined />,
            key: 'settingApp',
            label: <Link to={'/settings'}>{translate('app_settings')}</Link>,
          },
        ]
      : []),
    {
      type: 'divider',
    },
    {
      icon: <LogoutOutlined />,
      key: 'logout',
      label: <Link to={'/logout'}>{translate('logout')}</Link>,
    },
  ];

  return (
    <Header
      style={{
        padding: '16px 28px',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: '16px',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Dropdown
        menu={{
          items,
        }}
        trigger={['click']}
        placement="bottomRight"
        style={{ width: '280px', float: 'right' }}
      >
        <Avatar
          className="last"
          src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
          style={{
            color: '#1677ff',
            backgroundColor: currentAdmin?.photo ? 'none' : '#e6f4ff',
            boxShadow: 'rgba(22, 119, 255, 0.2) 0px 0px 8px 1px',
            cursor: 'pointer',
          }}
          size="large"
        >
          {currentAdmin?.name?.charAt(0)?.toUpperCase()}
        </Avatar>
      </Dropdown>

      {/* Notification Center Trigger Bell */}
      <Tooltip title="Notifications">
        <Badge count={unreadCount} overflowCount={99} size="small" offset={[-4, 4]}>
          <Button
            type="text"
            shape="circle"
            icon={<BellOutlined style={{ fontSize: 20, color: '#595959' }} />}
            onClick={() => setIsNotificationDrawerOpen(true)}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: unreadCount > 0 ? '#f0f7ff' : 'transparent',
              border: unreadCount > 0 ? '1px solid #bae0ff' : 'none',
            }}
          />
        </Badge>
      </Tooltip>

      <Space size={8}>
        {currentAdmin?.department && (
          <Tag
            icon={<ApartmentOutlined />}
            color="default"
            style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12 }}
          >
            {currentAdmin.department}
          </Tag>
        )}
        <Tag
          color={getRoleColor(role)}
          style={{ borderRadius: 12, padding: '2px 10px', fontWeight: 600, fontSize: 12 }}
        >
          {normalizeRole(role)}
        </Tag>
      </Space>

      {/* Notification Center Slide-Out Drawer */}
      <NotificationCenterDrawer
        visible={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onRefreshCount={setUnreadCount}
      />
    </Header>
  );
}
