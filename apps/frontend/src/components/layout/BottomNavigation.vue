<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Store, Package, ClipboardCheck, BarChart3, Sparkles } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const tabs = [
  { key: 'kasir', label: 'Kasir', icon: Store },
  { key: 'inventaris', label: 'Inventaris', icon: Package },
  { key: 'opname', label: 'Opname', icon: ClipboardCheck },
  { key: 'laporan', label: 'Laporan', icon: BarChart3 },
  { key: 'ai', label: 'Asisten AI', icon: Sparkles },
];

const activeTab = computed(() => route.name as string);

function activeClasses(key: string) {
  switch (key) {
    case 'inventaris':
      return 'bg-card-green text-white border-ink shadow-hard-sm';
    case 'opname':
      return 'bg-offline text-ink border-ink shadow-hard-sm';
    case 'laporan':
      return 'bg-card-coral text-white border-ink shadow-hard-sm';
    case 'ai':
      return 'bg-card-purple text-white border-ink shadow-hard-sm';
    default:
      return 'bg-brand text-white border-ink shadow-hard-sm';
  }
}

function go(key: string) {
  router.push({ name: key });
}
</script>

<template>
  <nav
    class="border-ink bg-surface shadow-hard-lg fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t-2 p-2 lg:hidden"
  >
    <button
      v-for="t in tabs"
      :key="t.key"
      @click="go(t.key)"
      :class="
        activeTab === t.key
          ? activeClasses(t.key)
          : 'text-ink/60 hover:text-ink border-transparent bg-transparent'
      "
      class="neo-press flex flex-col items-center justify-center rounded-xl border-2 px-3 py-1.5 transition-all"
    >
      <component :is="t.icon" class="h-5 w-5" />
      <span class="mt-0.5 text-[10px] font-extrabold">{{ t.label }}</span>
    </button>
  </nav>
</template>
