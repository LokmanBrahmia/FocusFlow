<script setup lang="ts">
import SiteHeader from './components/SiteHeader.vue'
import HeroSection from './components/HeroSection.vue'
import PreviewSection from './components/PreviewSection.vue'
import FeatureList from './components/FeatureList.vue'
import HowItWorks from './components/HowItWorks.vue'
import PrivacySection from './components/PrivacySection.vue'
import DownloadSection from './components/DownloadSection.vue'
import FaqSection from './components/FaqSection.vue'
import SiteFooter from './components/SiteFooter.vue'
</script>

<template>
  <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
    Skip to content
  </a>
  <SiteHeader />
  <main id="main">
    <HeroSection />
    <FeatureList />
    <HowItWorks />
    <PreviewSection />
    <PrivacySection />
    <DownloadSection />
    <FaqSection />
  </main>
  <SiteFooter />
</template>
