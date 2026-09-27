// 網站基本資訊：公司名稱、聯絡方式等集中在這裡修改
export const SITE = {
  name: '鋒塗利資產管理',
  nameEn: 'FENGTULI ASSET MANAGEMENT',
  shortName: '鋒塗利',
  tagline: '以紀律守護財富，以遠見成就傳承',
  description:
    '鋒塗利資產管理提供資產配置、財富傳承、退休規劃與企業財務顧問服務，以嚴謹的研究與長期紀律，陪伴客戶穩健累積財富。',
  // 以下聯絡資訊為範例，請替換為實際資料
  phone: '02-0000-0000',
  email: 'service@example.com',
  address: '台北市信義區（請填入實際地址）',
  hours: '週一至週五 09:00 – 18:00',
};

export const NAV = [
  { href: '/', label: '首頁' },
  { href: '/about', label: '關於我們' },
  { href: '/services', label: '服務項目' },
  { href: '/insights', label: '投資觀點' },
  { href: '/contact', label: '聯絡我們' },
];

export const CATEGORIES = ['市場觀點', '資產配置', '財富傳承', '公司公告'] as const;
