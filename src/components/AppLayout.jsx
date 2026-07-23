import { Layout, Menu } from 'antd';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: 'platform', label: '平台', children: [] },
  {
    key: 'common',
    label: '共用功能',
    children: [
      { key: 'common-report', label: '報表' },
      { key: 'common-special', label: '特例出貨' },
      { key: 'common-cost', label: '成本目録' },
      { key: 'common-currency', label: '通貨管理' },
      { key: 'common-finance-ship', label: '帳務出貨' },
      { key: 'common-monthly', label: '月結帳單' },
      { key: 'common-inventory', label: '倉庫總盤點' },
    ],
  },
  {
    key: 'distribution',
    label: '配貨管理',
    children: [
      { key: 'virtual-warehouse', label: '虛擬倉' },
      { key: 'distribution-records', label: '配貨記録' },
    ],
  },
  { key: 'products', label: '品牌', children: [] },
  { key: 'finance', label: '財務', children: [] },
];

function AppLayout({ children }) {
  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <span className="app-header-logo">UrMart</span>
      </Header>
      <Layout>
        <Sider width={200} className="app-sider">
          <Menu
            mode="inline"
            defaultOpenKeys={['common', 'distribution']}
            selectedKeys={['virtual-warehouse']}
            items={menuItems}
          />
        </Sider>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}

export default AppLayout;
