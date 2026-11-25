# FocusFlow — Desktop Distribution & Landing Page

## Role

You are a senior Electron.js engineer, DevOps engineer, and frontend developer.

Your task is to prepare my existing FocusFlow desktop application for public distribution.

Work directly in the existing project directory. Inspect the current codebase before making changes. Do not rebuild the application from scratch or remove existing functionality.

## 1. Project Context

FocusFlow is a personal productivity and study planning desktop application.

The application is built with:

- Vue 3
- TypeScript
- Electron.js
- Vite / electron-vite
- SQLite

The primary development environment is Fedora Linux.

The application must support:

- Fedora Linux: RPM package
- Ubuntu Linux: DEB package
- Windows: EXE installer

The application must work offline and preserve its existing functionality.

## 2. Main Objectives

Implement the following:

1. Configure Electron Builder for RPM, DEB, and Windows EXE builds.
2. Create a GitHub Actions workflow that builds all three packages automatically.
3. Publish the generated packages as GitHub Release assets.
4. Create a professional, responsive landing page for FocusFlow.
5. Deploy the landing page to Cloudflare Pages using its free plan.
6. Connect the landing page download buttons to the latest GitHub Release assets.
7. Document the complete build, release, and deployment workflow.

Do not purchase domains, subscribe to paid services, or create accounts on my behalf.

Do not publish anything publicly without my explicit approval.

## 3. Inspect the Existing Project

Before implementing anything:

- Inspect package.json.
- Inspect electron-vite configuration.
- Inspect the Electron main process and preload script.
- Inspect the existing application structure.
- Identify native dependencies, especially better-sqlite3.
- Identify existing application icons and branding.
- Check whether the application currently builds successfully.
- Identify any existing landing page or deployment configuration.

Preserve existing working code.

If the application is not yet functional, identify the blockers and fix only what is necessary for distribution.

Do not replace existing configuration files blindly.

## 4. Electron Builder Configuration

Configure electron-builder to generate:

### Fedora

- RPM package
- x86_64 architecture

### Ubuntu

- DEB package
- x64 architecture

### Windows

- NSIS EXE installer
- x64 architecture

Use the existing Electron and electron-vite configuration.

Use appropriate application metadata:

- Application name: FocusFlow
- App ID: com.focusflow.app
- Initial version: use the existing package.json version
- Linux category: Office
- Product name: FocusFlow

The output directory should be:

release/

Use descriptive filenames containing the application version and target platform.

Example:

```text
FocusFlow-0.1.0.x86_64.rpm
FocusFlow-0.1.0_amd64.deb
FocusFlow-Setup-0.1.0.exe
```

The exact filenames may follow electron-builder's conventions.

### Native Dependencies

If the project uses better-sqlite3 or another native dependency:

- Configure Electron ABI-compatible native dependency rebuilding.
- Ensure the dependency works in packaged applications.
- Do not assume that npm install is sufficient.
- Verify that the SQLite database is stored in Electron's user data directory.
- Verify that the application does not require write access to its installation directory.

Do not include development dependencies unnecessarily in production packages.

## 5. Cross-Platform Build Strategy

Create a GitHub Actions workflow:

.github/workflows/release.yml

Use separate build jobs for Linux and Windows.

### Linux Job

Build on a Linux runner.

Generate:

- RPM
- DEB

Use a reproducible and compatible build environment.

Do not assume that building on Fedora guarantees compatibility with every Ubuntu release.

Document the minimum supported Linux versions and dependencies.

### Windows Job

Build on a Windows runner.

Generate:

- Windows x64 NSIS installer

Ensure the application launches correctly after installation.

### Build Requirements

The workflow must:

- Install dependencies.
- Rebuild native Electron dependencies when required.
- Run TypeScript checks.
- Run existing tests.
- Build the application.
- Package the application.
- Upload generated packages as workflow artifacts.

Use npm if the existing project uses npm.

Preserve the existing package manager and lockfile.

Do not commit generated build artifacts to the source repository.

## 6. GitHub Releases

Configure the workflow to create GitHub Releases when a version tag is pushed.

Example:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow should:

1. Build all target packages.
2. Upload the packages as workflow artifacts.
3. Create a GitHub Release.
4. Attach RPM, DEB, and EXE files to the release.
5. Include a generated release description.

Use the repository's GitHub token where possible.

Do not hardcode secrets or personal access tokens.

Do not create a release from an unapproved commit.

Do not publish prerelease builds as stable releases unless explicitly configured.

## 7. Landing Page

Create a professional landing page for FocusFlow.

Use:

- Vue 3
- TypeScript
- Vite
- Tailwind CSS if already installed or if appropriate

The landing page should be a static website that can be deployed to Cloudflare Pages.

Keep it separate from the Electron runtime.

Do not bundle Electron or SQLite into the landing page.

If the project already contains a suitable frontend structure, reuse it where practical.

Otherwise, create a separate directory:

landing/

### Landing Page Design

Create a premium, minimalist productivity-app landing page.

Visual style:

- Modern SaaS aesthetic.
- Clean typography.
- Dark theme by default.
- Light theme support if appropriate.
- Responsive desktop and mobile layout.
- Subtle animations.
- Clear visual hierarchy.
- Consistent spacing.
- Professional icons.

Use Lucide icons if available.

Avoid excessive animations, unnecessary gradients, and generic AI-generated illustrations.

Do not invent customer testimonials, ratings, user counts, or product claims.

### Landing Page Sections

#### Hero

Include:

Product name:
FocusFlow

Headline:
"Take control of your time. Focus on what matters."

Supporting description:
"FocusFlow helps you organize your tasks, focus with Pomodoro sessions, and understand how you spend your time."

Primary CTA:
"Download FocusFlow"

Secondary CTA:
"Explore Features"

Show a screenshot of the actual application if one is available.

If no screenshot exists, create a clean, clearly illustrative product mockup. Do not pretend that an illustrative mockup is a real application screenshot.

#### Features

Present the following features:

- Pomodoro focus timer.
- Study task management.
- Daily and weekly planning.
- Productivity statistics.
- Offline-first experience.
- Local data storage.

Only advertise features that are actually implemented.

If a feature is planned but not implemented, do not present it as currently available.

#### Download Section

Create three download cards:

1. Fedora Linux — RPM
2. Ubuntu Linux — DEB
3. Windows — EXE

Each card should display:

- Operating system.
- Package format.
- Architecture.
- Current version.
- Download button.

Show the latest version dynamically when possible.

Do not hardcode the current version in multiple places.

#### Additional Sections

Include:

- Screenshots or product preview.
- Short explanation of how FocusFlow works.
- Privacy and offline-first explanation.
- FAQ.
- Footer with GitHub repository and license information.

Do not invent a license. Read the existing repository license or leave a clearly documented placeholder.

## 8. Download Links

Use GitHub Releases as the file hosting service.

The landing page must link to actual release assets.

For stable releases, use the latest stable release.

For example, use the GitHub Releases API or stable release URLs where appropriate.

Do not hardcode a version-specific URL in the landing page.

The download buttons should resolve to the correct RPM, DEB, or EXE asset.

If the latest release does not contain a particular package, display a clear message instead of linking to a nonexistent file.

Do not make download buttons appear functional if no valid download URL exists.

Use the actual repository owner and repository name from the existing Git configuration.

If these are unavailable, ask me for them rather than inventing values.

## 9. Cloudflare Pages Deployment

Prepare the landing page for Cloudflare Pages.

Use the free static hosting plan.

Provide:

- Build command.
- Build output directory.
- Required environment variables, if any.
- Deployment instructions.
- GitHub integration instructions.

The deployment should support:

- Automatic deployment from the main branch.
- Preview deployments for pull requests.
- HTTPS.
- A Cloudflare Pages subdomain.

Do not attempt to create a Cloudflare account or deploy publicly without my approval.

Do not require paid Cloudflare features.

Keep secrets out of the frontend.

## 10. Landing Page SEO

Implement:

- Page title.
- Meta description.
- Open Graph metadata.
- Favicon.
- Responsive viewport configuration.
- Semantic HTML.
- Accessible navigation.
- Proper heading hierarchy.

Use the application name and actual product description.

Do not invent external links or social media accounts.

## 11. Version Management

Use package.json as the primary application version source.

Ensure that:

- The landing page displays the current stable version.
- GitHub Release tags correspond to the application version.
- Download filenames correspond to the application version.
- The release workflow does not publish inconsistent versions.

Document how to update the version for a new release.

Avoid maintaining the version manually in several unrelated files.

## 12. Security and Privacy

Ensure that:

- The Electron application remains offline-first.
- The landing page does not collect unnecessary personal information.
- No secrets are exposed in frontend code.
- No analytics or tracking service is added without approval.
- No remote code is executed by the desktop application.
- The existing Electron security configuration is preserved.
- The application continues to use secure IPC.

Do not introduce authentication, payments, subscriptions, or cloud synchronization in this task.

## 13. Testing and Validation

Before considering the work complete:

### Application

- Verify the Electron production build.
- Verify the RPM package is generated.
- Verify the DEB package is generated.
- Verify the Windows installer is generated.
- Verify native dependencies are correctly packaged.
- Verify the application data directory is writable.
- Verify the application does not depend on the development environment.

### Landing Page

- Run the production build.
- Verify responsive layouts.
- Verify download links.
- Verify that missing release assets are handled correctly.
- Verify that the page works as a static site.
- Verify that no secrets are exposed.

### GitHub Actions

- Validate the workflow syntax.
- Ensure the workflow runs on the appropriate operating systems.
- Ensure artifacts are uploaded correctly.
- Ensure release publishing only occurs for approved version tags.

If a platform-specific package cannot be tested locally, clearly document the limitation.

Do not claim a package was tested if it was only built.

## 14. Documentation

Create or update README.md with:

- Project overview.
- Supported operating systems.
- Development setup.
- Build commands.
- Packaging commands.
- Release workflow.
- Landing page development.
- Cloudflare Pages deployment.
- How to create a new release.
- Known limitations.
- Minimum supported operating system versions.

Create a separate:

DISTRIBUTION.md

This document must explain the complete process of distributing FocusFlow.

Include exact commands.

Example:

```bash
npm install
npm run build
```

Then document the relevant platform-specific packaging commands.

Also document how to:

1. Push changes to GitHub.
2. Create a version tag.
3. Trigger GitHub Actions.
4. Verify generated artifacts.
5. Publish a stable GitHub Release.
6. Verify landing page download links.
7. Deploy the landing page to Cloudflare Pages.

## 15. Important Constraints

- Do not rewrite the entire application.
- Do not remove existing functionality.
- Do not introduce paid infrastructure.
- Do not publish publicly without approval.
- Do not create fake download links.
- Do not create fake product screenshots.
- Do not claim compatibility without testing.
- Do not add unnecessary dependencies.
- Do not add SaaS functionality.
- Do not commit secrets.
- Do not stop after writing configuration files.

Implement the actual changes and verify them.

## 16. Execution Instructions

Work in the existing repository.

Start by inspecting the project.

Then:

1. Explain the current project structure and identify missing distribution components.
2. Propose a short implementation plan.
3. Implement the Electron packaging configuration.
4. Implement the GitHub Actions workflow.
5. Create the landing page.
6. Implement release-based download links.
7. Prepare Cloudflare Pages deployment.
8. Run the available tests and production builds.
9. Fix issues.
10. Document the final workflow.

Work in small, verifiable steps.

Do not stop after providing code snippets or a plan.

If an account, repository name, GitHub permission, Cloudflare configuration, or other external input is required, explain exactly what is missing and continue implementing everything that does not require it.

At the end, provide:

- Files created or modified.
- Build commands.
- Release instructions.
- Cloudflare Pages deployment instructions.
- Test results.
- Remaining limitations.
- Any manual steps I must perform.

Begin by inspecting the existing project directory.