import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { canAccessModule } from '@/utils/rbac';

import { useAppContext } from '@/context/appContext';

import useLanguage from '@/locale/useLanguage';
import logoIcon from '@/style/images/logo-icon.svg';

import useResponsive from '@/hooks/useResponsive';
import { SHOUTOUT_URL } from '@/config/serverApiConfig';

import {
  DashboardOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  CheckSquareOutlined,
  ProjectOutlined,
  DollarOutlined,
  CalendarOutlined,
  GiftOutlined,
  TrophyOutlined,
  NotificationOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  CloudOutlined,
  SettingOutlined,
  MenuOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Navigation() {
  const { isMobile } = useResponsive();

  return isMobile ? <MobileSidebar /> : <Sidebar collapsible={false} />;
}

function Sidebar({ collapsible, isMobile = false }) {
  let location = useLocation();

  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose } = stateApp;
  const { navMenu } = appContextAction;
  const [showLogoApp, setLogoApp] = useState(isNavMenuClose);
  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1) || 'dashboard');

  const translate = useLanguage();
  const navigate = useNavigate();

  const currentAdmin = useSelector(selectCurrentAdmin);
  const userRole = currentAdmin?.role || 'EMPLOYEE';

  const items = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: <Link to={'/'}>{translate('Dashboard')}</Link>,
    },
    {
      key: 'employees',
      icon: <TeamOutlined />,
      label: <Link to={'/employees'}>{translate('Employees')}</Link>,
    },
    {
      key: 'attendance',
      icon: <ClockCircleOutlined />,
      label: <Link to={'/attendance'}>{translate('Attendance')}</Link>,
    },
    {
      key: 'leave',
      icon: <CoffeeOutlined />,
      label: <Link to={'/leave'}>{translate('Leave')}</Link>,
    },
    {
      key: 'tasks',
      icon: <CheckSquareOutlined />,
      label: <Link to={'/tasks'}>{translate('Tasks')}</Link>,
    },
    {
      key: 'projects',
      icon: <ProjectOutlined />,
      label: <Link to={'/projects'}>{translate('Projects')}</Link>,
    },
    {
      key: 'payroll',
      icon: <DollarOutlined />,
      label: <Link to={'/payroll'}>{translate('Payroll')}</Link>,
    },
    {
      key: 'documents',
      icon: <FileProtectOutlined />,
      label: <Link to={'/documents'}>{translate('Document Vault')}</Link>,
    },
    {
      key: 'calendar',
      icon: <CalendarOutlined />,
      label: <Link to={'/calendar'}>{translate('Calendar')}</Link>,
    },
    {
      key: 'events',
      icon: <GiftOutlined />,
      label: <Link to={'/events'}>{translate('Events & Celebrations')}</Link>,
    },
    {
      key: 'recognition',
      icon: <TrophyOutlined />,
      label: (
        <a href={SHOUTOUT_URL} rel="noopener noreferrer">
          {translate('Recognition')}
        </a>
      ),
      onClick: () => {
        window.location.href = SHOUTOUT_URL;
      },
    },
    {
      key: 'bulletin',
      icon: <NotificationOutlined />,
      label: <Link to={'/bulletin'}>{translate('Bulletin / News')}</Link>,
    },
    {
      key: 'policies',
      icon: <FileProtectOutlined />,
      label: <Link to={'/policies'}>{translate('Policies')}</Link>,
    },
    {
      key: 'admin',
      icon: <SafetyCertificateOutlined />,
      label: <Link to={'/admin'}>{translate('Admin')}</Link>,
    },
    {
      key: 'itadmin',
      icon: <CloudOutlined />,
      label: <Link to={'/it-admin'}>{translate('IT & Digital Admin')}</Link>,
    },
    {
      key: 'templates',
      icon: <FileTextOutlined />,
      label: <Link to={'/templates'}>{translate('Templates')}</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link to={'/settings'}>{translate('Settings')}</Link>,
    },
  ];

  useEffect(() => {
    if (location) {
      const path = location.pathname.slice(1);
      if (path === '' || path === '/') {
        setCurrentPath('dashboard');
      } else {
        // Menu keys are unsegmented (e.g. "itadmin") while URLs can contain
        // separators (e.g. "/it-admin"). Normalize so the active item is
        // actually highlighted.
        const primary = path.split('/')[0].replace(/[-_\s]/g, '').toLowerCase();
        setCurrentPath(primary);
      }
    }
  }, [location]);

  useEffect(() => {
    if (isNavMenuClose) {
      setLogoApp(isNavMenuClose);
    }
    const timer = setTimeout(() => {
      if (!isNavMenuClose) {
        setLogoApp(isNavMenuClose);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isNavMenuClose]);

  const onCollapse = () => {
    navMenu.collapse();
  };

  return (
    <Sider
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : collapsible}
      onCollapse={onCollapse}
      className="navigation"
      width={256}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: isMobile ? 'absolute' : 'relative',
        bottom: '20px',
        ...(!isMobile && {
          left: '20px',
          top: '20px',
        }),
      }}
      theme={'light'}
    >
      <div
        className="logo"
        onClick={() => navigate('/')}
        style={{
          cursor: 'pointer',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img src={logoIcon} alt="TecMotiv Logo" style={{ height: '32px' }} />

        {!showLogoApp && (
          <div style={{ marginLeft: 12, lineHeight: 1.2 }}>
            <span
              style={{
                fontSize: '17px',
                fontWeight: '800',
                letterSpacing: '0.3px',
                color: '#22242a',
                display: 'block',
              }}
            >
              Tecmotiv
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.8px',
                color: '#0097a7',
                textTransform: 'uppercase',
              }}
            >
              Solutions ERP
            </span>
          </div>
        )}
      </div>
      <Menu
        items={items.filter((item) => canAccessModule(userRole, item.key))}
        mode="inline"
        theme={'light'}
        selectedKeys={[currentPath]}
        style={{
          width: 256,
          borderRight: 0,
        }}
      />
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);
  const showDrawer = () => {
    setVisible(true);
  };
  const onClose = () => {
    setVisible(false);
  };

  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={showDrawer}
        className="mobile-sidebar-btn"
        style={{ marginLeft: 25 }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>
      <Drawer
        width={250}
        placement={'left'}
        closable={false}
        onClose={onClose}
        open={visible}
      >
        <Sidebar collapsible={false} isMobile={true} />
      </Drawer>
    </>
  );
}
