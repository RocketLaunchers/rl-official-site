import { useEffect, useState, type CSSProperties } from 'react';
import ProjectPicker from './components/ProjectPicker';
import Dashboard from './components/Dashboard';
import Help from './components/Help';
import SeasonsEditor from './components/SeasonsEditor';
import PeopleEditor from './components/PeopleEditor';
import RolesEditor from './components/RolesEditor';
import SubteamsEditor from './components/SubteamsEditor';
import RocketsEditor from './components/RocketsEditor';
import SponsorsEditor from './components/SponsorsEditor';
import EventsEditor from './components/EventsEditor';
import ConstitutionEditor from './components/ConstitutionEditor';
import NewsEditor from './components/NewsEditor';
import Editor from './components/Editor';
import GalleryEditor from './components/GalleryEditor';
import MediaLibrary from './components/MediaLibrary';
import SiteEditor from './components/SiteEditor';
import AboutEditor from './components/AboutEditor';
import PreviewServer from './components/PreviewServer';
import Publish from './components/Publish';
import { AssetPickerProvider } from './components/AssetPicker';
import { Icon } from './components/icons';
import { NAV_GROUPS, SECTION_COLOR, type Section } from './nav';

const STORAGE_KEY = 'rl-cms.repo';
const THEME_KEY = 'rl-cms.theme';
type Theme = 'dark' | 'light';

export default function App() {
  const [repo, setRepo] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [section, setSection] = useState<Section>('dashboard');
  const [slug, setSlug] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(THEME_KEY) as Theme) || 'dark');

  useEffect(() => {
    if (repo) localStorage.setItem(STORAGE_KEY, repo);
  }, [repo]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  function go(next: Section) {
    setSection(next);
    setSlug(null);
  }

  if (!repo) {
    return <ProjectPicker recent={localStorage.getItem(STORAGE_KEY)} onOpen={setRepo} />;
  }

  return (
    <AssetPickerProvider repo={repo}>
    <div className="layout">
      <div className="sidebar">
        <div className="brand">Rocket Launchers CMS</div>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="nav-group" style={{ '--g': group.color } as CSSProperties}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${section === item.key ? 'active' : ''}`}
                onClick={() => go(item.key)}
              >
                <span className="nav-ico"><Icon name={item.icon} size={16} /></span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
        <div className="repo" title={repo}>{repo}</div>
        <div className="sidebar-foot">
          <button className="small ghost" onClick={() => { setRepo(null); setSlug(null); }}>Change repo</button>
          <button
            className="theme-toggle"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle light/dark theme"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
          </button>
        </div>
      </div>

      <div className="main" style={{ '--section': SECTION_COLOR[section] } as CSSProperties}>
        {section === 'dashboard' && <Dashboard repo={repo} onNavigate={go} />}
        {section === 'help' && <Help onNavigate={go} />}
        {section === 'seasons' && <SeasonsEditor repo={repo} />}
        {section === 'people' && <PeopleEditor repo={repo} />}
        {section === 'roles' && <RolesEditor repo={repo} />}
        {section === 'subteams' && <SubteamsEditor repo={repo} />}
        {section === 'rockets' && <RocketsEditor repo={repo} />}
        {section === 'sponsors' && <SponsorsEditor repo={repo} />}
        {section === 'events' && <EventsEditor repo={repo} />}
        {section === 'constitution' && <ConstitutionEditor repo={repo} />}
        {section === 'news' && (slug
          ? <Editor repo={repo} slug={slug} onBack={() => setSlug(null)} />
          : <NewsEditor repo={repo} onOpenPost={setSlug} />)}
        {section === 'gallery' && <GalleryEditor repo={repo} />}
        {section === 'assets' && <MediaLibrary repo={repo} />}
        {section === 'site' && <SiteEditor repo={repo} />}
        {section === 'about' && <AboutEditor repo={repo} />}
        {section === 'preview' && <PreviewServer repo={repo} />}
        {section === 'publish' && <Publish repo={repo} />}
      </div>
    </div>
    </AssetPickerProvider>
  );
}
