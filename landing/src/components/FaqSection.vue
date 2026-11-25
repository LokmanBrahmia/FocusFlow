<script setup lang="ts">
const faqs = [
  {
    q: 'Do I need an account or an internet connection?',
    a: 'No. FocusFlow runs entirely on your computer and works the same with or without a connection. When you are online it checks GitHub for new versions, which you can turn off in Settings.'
  },
  {
    q: 'Where is my data stored?',
    a: 'In one database file in your user folder: ~/.config/FocusFlow/focusflow.sqlite on Linux, and %APPDATA%\\FocusFlow\\focusflow.sqlite on Windows. Uninstalling the app does not delete it.'
  },
  {
    q: 'How do I move my data to another computer?',
    a: 'In Settings, under Your data, back up the database or export everything as JSON, then restore or import it on the other computer. FocusFlow saves a copy of the existing data before replacing it.'
  },
  {
    q: 'Windows warns that the installer is from an unknown publisher. Why?',
    a: 'The installer is not code-signed yet, so Windows SmartScreen cannot identify the publisher. If you downloaded it from FocusFlow’s GitHub release, choose “More info”, then “Run anyway”.'
  },
  {
    q: 'How do I update to a new version?',
    a: 'FocusFlow tells you when a new version is out. On Windows it can download and install the update for you when you choose “Install and restart”. On Fedora and Ubuntu it links to the new package, which you install over the old one with dnf or apt. Your tasks, history and settings are always kept.'
  },
  {
    q: 'Does it run on macOS or other Linux distributions?',
    a: 'Packages are provided for Fedora (RPM), Ubuntu (DEB) and Windows. There is no macOS version at the moment. Other Debian- or Fedora-based distributions may work but have not been tested.'
  }
]
</script>

<template>
  <section id="faq" aria-labelledby="faq-title" class="mx-auto max-w-6xl px-5 py-16 sm:px-8">
    <div class="grid gap-10 lg:grid-cols-[1fr_2fr]">
      <h2 id="faq-title" class="display text-[clamp(1.9rem,3.6vw,2.75rem)]">Questions</h2>
      <div class="divide-y divide-line border-y border-line">
        <details v-for="f in faqs" :key="f.q" class="group py-1">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg [&::-webkit-details-marker]:hidden">
            {{ f.q }}
            <span class="text-2xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p class="pb-5 text-muted">{{ f.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>
