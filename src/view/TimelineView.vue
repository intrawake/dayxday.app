<template>
  <DayView
    section="timeline"
    browse-first
    :selected-date="selectedDate"
    @select-date="navigateToDate"
  />
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getLocalDayAtMs,
  localDateFromString,
} from "../function/localCalendar";
import DayView from "./DayView.vue";

const route = useRoute();
const router = useRouter();
const selectedDate = computed(() => {
  const day = route.params.day;
  if (typeof day === "string" && localDateFromString(day)) return day;
  return undefined;
});

watch(
  () => route.params.day,
  (day) => {
    if (
      day !== undefined &&
      (typeof day !== "string" || !localDateFromString(day))
    ) {
      void router.replace({ name: "TimelineView" });
    }
  },
  { immediate: true },
);

function navigateToDate(day: string) {
  const params = day === getLocalDayAtMs(Date.now()) ? {} : { day };
  void router.push({ name: "TimelineView", params });
}
</script>
