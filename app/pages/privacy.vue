<script setup lang="ts">
useHead({
    title: 'Privacy Policy | Supapoker',
    meta: [
        { name: 'description', content: 'Our commitment to your privacy. No data selling, privacy-first analytics.' }
    ]
})

const lastUpdated = 'February 8, 2026'
</script>
<template>
    <UContainer class="py-12 max-w-3xl">
        <div class="space-y-8">
            <div>
                <h1 class="text-3xl font-bold mb-4">Privacy Policy</h1>
                <p class="text-gray-500 dark:text-gray-400">
                    Last updated: {{ lastUpdated }}
                </p>
            </div>

            <div class="prose dark:prose-invert max-w-none">
                <section class="space-y-4">
                    <h2 class="text-xl font-semibold">Your Data is Yours</h2>
                    <p>
                        At Supapoker, we believe in privacy by default. We generally do not collect personal information
                        unless it is necessary for the operation of our service.
                    </p>
                    <UCard class="bg-gray-50 dark:bg-gray-900 border-none ring-1 ring-gray-200 dark:ring-gray-800">
                        <div class="flex items-center gap-3">
                            <UIcon name="i-lucide-shield-check" class="w-6 h-6 text-green-500" />
                            <p class="font-medium">We do not sell your personal information to anyone.</p>
                        </div>
                    </UCard>
                </section>

                <section class="space-y-4 mt-8">
                    <h2 class="text-xl font-semibold">Analytics</h2>
                    <p>
                        We use <a href="https://withcabin.com" target="_blank" rel="noopener noreferrer"
                            class="text-primary hover:underline">Cabin</a> for our web analytics. Cabin is a
                        privacy-first analytics platform that is designed to respect your digital rights.
                    </p>
                    <ul class="list-disc pl-5 space-y-2 text-gray-600 dark:text-gray-300">
                        <li>No cookies are used for analytics purposes.</li>
                        <li>No personal data is collected or stored.</li>
                        <li>No cross-site tracking.</li>
                        <li>Everything is 100% GDPR, CCPA, and PECR compliant.</li>
                    </ul>
                </section>

                <section class="space-y-4 mt-8">
                    <h2 class="text-xl font-semibold">Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us.
                    </p>
                </section>
            </div>
        </div>
    </UContainer>
</template>
