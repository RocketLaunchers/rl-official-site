import { useEffect, useState } from 'react';
import ProjectPicker from './components/ProjectPicker';
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import ProjectsEditor from './components/ProjectsEditor';
import GalleryEditor from './components/GalleryEditor';
import AboutEditor from './components/AboutEditor';
import HomeEditor from './components/HomeEditor';
import PreviewServer from './components/PreviewServer';
import Publish from './components/Publish';

const STORAGE_KEY = 'portfolio-cms.repo';

type Section = 'home' | 'blog' | 'projects' | 'community' | 'about' | 'preview' | 'publish';

const NAV_GROUPS: { label: string; items: { key: Section; label: string }[] }[] = [
  {
    label: 'Content',
    items: [
      { key: 'home', label: 'Home' },
      { key: 'blog', label: 'Blog' },
      { key: 'projects', label: 'Projects' },
      { key: 'community', label: 'Community' },
      { key: 'about', label: 'About' },
    ],
  },
  {
    label: 'Publish',
    items: [
      { key: 'preview', label: 'Preview' },
      { key: 'publish', label: 'Publish' },
    ],
  },
];

export default function App() {
  const [repo, setRepo] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [section, setSection] = useState<Section>('home');
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    if (repo) localStorage.setItem(STORAGE_KEY, repo);
  }, [repo]);

  if (!repo) {
    return <ProjectPicker recent={localStorage.getItem(STORAGE_KEY)} onOpen={setRepo} />;
  }

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="brand">Portfolio CMS</div>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="nav-group">
            <div className="nav-group-label">{group.label}</div>
            {group.items.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${section === item.key ? 'active' : ''}`}
                onClick={() => { setSection(item.key); setSlug(null); }}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
        <div className="repo" title={repo}>{repo}</div>
        <button className="small ghost" onClick={() => { setRepo(null); setSlug(null); }}>Change repo</button>
      </div>

      <div className="main">
        {section === 'home' && <HomeEditor repo={repo} />}
        {section === 'blog' && (slug
          ? <Editor repo={repo} slug={slug} onBack={() => setSlug(null)} />
          : <Dashboard repo={repo} onOpenPost={setSlug} />)}
        {section === 'projects' && <ProjectsEditor repo={repo} />}
        {section === 'community' && <GalleryEditor repo={repo} />}
        {section === 'about' && <AboutEditor repo={repo} />}
        {section === 'preview' && <PreviewServer repo={repo} />}
        {section === 'publish' && <Publish repo={repo} />}
      </div>
    </div>
  );
}
