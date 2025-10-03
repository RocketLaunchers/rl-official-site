### Implementation Steps for TypeScript-Based Markdown Interpreter

To implement the TypeScript-based interpreter for reading and rendering Markdown (MD) files from a "blogs" folder, proceed incrementally. This replaces the hardcoded `blogPosts` array with dynamic loading and parsing. Assume a modern React setup (e.g., using Vite or a similar bundler for `import.meta.glob` support) to handle file imports at build time. The interpreter will parse MD files into structured `BlogPost` objects matching your existing type, including sections for text, headings, images, and videos. Use libraries like `marked` for basic MD parsing or `unified/remark` for structured output to map to sections. Handle assets with relative paths assuming they are colocated in subfolders (e.g., `blogs/post-id/assets/`).

#### Step 1: Set Up the Blogs Folder and Sample MD Structure
- Create a `blogs` directory in your project's source folder (e.g., `src/blogs/`).
- Define a standard MD file structure for each post:
  - Start with YAML frontmatter (delimited by `---`) for metadata: `id`, `title`, `date`, `excerpt`, `readTime`, and `tags` (as an array).
  - Follow with Markdown content: Use `#` for headings (map to 'heading' sections), paragraphs for 'text', `![alt](relative/path.jpg)` for 'image', and a custom embed for videos (e.g., `[video: /path.mp4 | caption | controls=true | muted=true | autoplay=false | loop=false]` to parse into 'video' sections).
- Example MD file (`blogs/brunito-first-avionics-system/index.md`):
  ```
  ---
  id: 'brunito-first-avionics-system'
  title: 'Brunito - The First Avionics System at the Rocket Launchers for Disparado'
  date: 'July 11, 2025'
  excerpt: 'The inspiring journey of developing Brunito, our contingency flight computer, amid trade disruptions and tight deadlines.'
  readTime: '10 min read'
  tags: ['Avionics', 'Flight Computer', 'STM32', 'Embedded Systems', 'RTOS', 'Rocket Launchers']
  ---
  
  In early 2024, our avionics team... [full text content]
  
  ![Brunito prototype flight computer](assets/brunito-proto.jpg)
  
  Building on Bruno's... [more text]
  
  [video: videos/brunitosquirt.mp4 | Final systems check... | controls=true | muted=true | autoplay=false | loop=false]
  
  # Lessons Learned
  
  Mitigate EMI via... [text]
  ```
- Place assets in a subfolder (e.g., `blogs/brunito-first-avionics-system/assets/`) for relative referencing.
- Test: Manually create 1-2 sample MD files based on your existing post data to verify structure.

#### Step 2: Install Required Dependencies
- Run `npm install gray-matter marked` (or yarn equivalent) for frontmatter parsing (`gray-matter`) and basic MD-to-HTML conversion (`marked`).
- For structured section parsing (to match your `sections` array), install `unified remark-parse remark-mdx` if needed for advanced AST handling; start with `marked` for simplicity and upgrade if parsing complexity increases.
- Update your `BlogPost` type if necessary to accommodate parsed data (e.g., ensure `content.sections` handles optional fields like `caption` for videos).

#### Step 3: Create a Utility Function to Parse Individual MD Files
- In a new file (e.g., `src/utils/parseBlogPost.ts`), implement a function `parseBlogPost(mdContent: string, postId: string)`:
  - Use `gray-matter` to extract frontmatter and MD body: `const { data, content } = matter(mdContent);`.
  - Validate metadata: Ensure required fields like `id`, `title` are present; map to `BlogPost` properties.
  - Parse the MD body into sections:
    - Split content by lines or use `marked.lexer(content)` to get tokens.
    - Map tokens: Paragraphs to `{ type: 'text', content: text }`, headings (level 2+) to `{ type: 'heading', content: text }`, images to `{ type: 'image', content: src, alt: alt }`.
    - For videos, use a regex to detect custom embeds (e.g., /\[video: (.+?) \| (.+?) \| (.+?)\]/) and parse into `{ type: 'video', content: src, caption, controls, muted, autoplay, loop }`.
  - Return a `BlogPost` object.
- Test: Import a sample MD file as text (e.g., via `import md from '../blogs/sample/index.md?raw';`) and log the parsed output in a temporary script.

#### Step 4: Implement Dynamic Loading of All Blog Posts
- In `src/data/blogPosts.ts`, replace the hardcoded array with a dynamic loader using `import.meta.glob`:
  - `const mdFiles = import.meta.glob('../blogs/*/index.md', { as: 'raw', eager: true });`.
  - Iterate over entries: Extract `postId` from paths (e.g., via regex), parse each MD string with your utility function, and collect into `blogPosts: BlogPost[]`.
- Handle errors: Skip invalid files and log warnings.
- Update import paths for assets: Prefix with `/` or use aliases if bundler-specific (e.g., Vite public folder).
- Test: Console.log the generated `blogPosts` array in your app to ensure it matches the hardcoded version.

#### Step 5: Integrate with Existing Components
- In `Blog.tsx`, import the dynamic `blogPosts` and render the list as before (no changes needed if structure matches).
- In `BlogPost.tsx`, use the dynamic `blogPosts.find()` to fetch by ID.
- Update rendering in the `switch` statement:
  - Ensure 'video' handles parsed attributes (e.g., pass to `<Video>` component).
  - For images, resolve paths relative to public folder if needed.
- Test: Run the app, navigate to `/blog` and a post; verify rendering matches the original hardcoded version.

#### Step 6: Add Build-Time Optimizations and Error Handling
- If using a bundler like Vite, ensure MD files are included in the build.
- Implement caching or memoization for parsing if the site grows.
- Add fallback: If no posts load, display a message.
- Test edge cases: Empty folder, malformed MD, missing assets.

#### Step 7: Refine for Production
- Automate asset copying: Use bundler plugins (e.g., vite-plugin-copy) to move blog assets to output directory.
- Optimize performance: If posts are numerous, lazy-load content in `BlogPost.tsx` (e.g., via `useEffect` fetch if switching to API).
- Deploy and verify: Build the site, check that dynamic posts render correctly without hardcoded data.

Proceed sequentially, testing after each step to ensure incremental progress. If your bundler lacks `import.meta.glob`, consider a Node script to generate a JSON file at build time.