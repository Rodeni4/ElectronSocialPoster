type TabName = 'post' | 'auth';

type TabsOptions = {
  tabPostBtn: HTMLElement | null;
  tabAuthBtn: HTMLElement | null;
  postTabPanel: HTMLElement | null;
  authTabPanel: HTMLElement | null;
  defaultTab?: TabName;
};

export function initTabs(options: TabsOptions): void {
  const {
    tabPostBtn: tabPostBtnRaw,
    tabAuthBtn: tabAuthBtnRaw,
    postTabPanel: postTabPanelRaw,
    authTabPanel: authTabPanelRaw,
    defaultTab = 'post'
  } = options;

  if (!tabPostBtnRaw || !tabAuthBtnRaw || !postTabPanelRaw || !authTabPanelRaw) {
    console.error('Tabs: не найдены элементы вкладок.');
    return;
  }

  const tabPostBtn = tabPostBtnRaw;
  const tabAuthBtn = tabAuthBtnRaw;
  const postTabPanel = postTabPanelRaw;
  const authTabPanel = authTabPanelRaw;

  function setActiveTab(tab: TabName): void {
    const isPost = tab === 'post';

    tabPostBtn.classList.toggle('is-active', isPost);
    tabAuthBtn.classList.toggle('is-active', !isPost);

    postTabPanel.classList.toggle('active', isPost);
    authTabPanel.classList.toggle('active', !isPost);
  }

  tabPostBtn.addEventListener('click', () => {
    setActiveTab('post');
  });

  tabAuthBtn.addEventListener('click', () => {
    setActiveTab('auth');
  });

  setActiveTab(defaultTab);
}