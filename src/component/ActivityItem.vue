<template>
  <div
    class="activity-item"
    :class="{ adjusting }"
    :data-activity-id="activity.id"
    role="button"
    tabindex="0"
    :aria-label="`Edit ${timeLabel}: ${title}`"
    :title="
      adjusting
        ? `Tap to edit tags; drag to adjust end: ${timeLabel}, ${title}`
        : `Tap to edit tags: ${timeLabel}, ${title}`
    "
    @click="clickToEdit && $emit('edit', activity.id)"
    @keydown.enter="$emit('edit', activity.id)"
    @keydown.space.prevent="$emit('edit', activity.id)"
  >
    {{ title }}
  </div>
</template>

<script setup lang="ts">
import type { Activity } from "../store/activity";

defineProps<{
  activity: Activity;
  title: string;
  timeLabel: string;
  adjusting?: boolean;
  clickToEdit?: boolean;
}>();

defineEmits<{ edit: [activityId: number] }>();
</script>

<style scoped>
.activity-item {
  box-sizing: border-box;
  position: absolute;
  left: 0;
  right: 0;
  background-color: var(--color-activity);
  border: 1px solid var(--color-border);
  padding: 10px;
  cursor: pointer;
  overflow: hidden;
  user-select: none;
  touch-action: pan-y;
}
.activity-item.adjusting {
  cursor: move;
  touch-action: none;
}
</style>
