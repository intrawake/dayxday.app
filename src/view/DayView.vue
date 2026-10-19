<template>
  <div class="day-view" :class="{ 'timeline-only': section === 'timeline' }">
    <h1 ref="dayHeadingRef" tabindex="-1">
      {{ section === "timeline" ? "Timeline" : "Day View" }}
    </h1>
    <template v-if="section !== 'timeline'">
      <CapturePanel v-model:selected-tag-ids="selectedTagIds" :now-ms="nowMs" />
      <TodayReceipt :receipt="todayReceipt" />
    </template>
    <template v-if="section !== 'today'">
      <section v-if="section === 'timeline'" class="timeline-tag-picker">
        <h2>Tags for corrections</h2>
        <TagPicker
          v-if="activityStore.activeTagGroups.length"
          v-model:selected-tag-ids="selectedTagIds"
          :tag-groups="activityStore.tagGroups"
          :recent-tag-selections="activityStore.recentTagSelections"
          :title-for-selection="activityStore.titleForSelection"
          @select-recent="selectRecentForCorrection"
        />
        <p v-else>
          Create tags before correcting the timeline.
          <RouterLink to="/tags">Configure tags</RouterLink>
        </p>
      </section>
      <div class="timeline-toolbar">
        <nav class="date-navigation" aria-label="Timeline date">
          <button
            type="button"
            aria-label="Previous day"
            @click="selectDateOffset(-1)"
          >
            ‹
          </button>
          <strong class="selected-date">{{ timelineDateLabel }}</strong>
          <button
            type="button"
            aria-label="Next day"
            @click="selectDateOffset(1)"
          >
            ›
          </button>
        </nav>
        <div class="date-actions">
          <button
            type="button"
            :disabled="isToday"
            @click="selectTimelineDate(currentDate)"
          >
            Today
          </button>
          <button
            type="button"
            class="now-action"
            :disabled="!isToday"
            @click="scrollToCurrentTime"
          >
            Now
          </button>
        </div>
        <div class="timeline-mode" aria-label="Timeline interaction mode">
          <button
            type="button"
            :aria-pressed="!adjustMode"
            @click="adjustMode = false"
          >
            Browse
          </button>
          <button
            type="button"
            :aria-pressed="adjustMode"
            @click="adjustMode = true"
          >
            Adjust times
          </button>
          <button
            v-if="adjustMode"
            type="button"
            class="start-creation"
            :aria-pressed="creationMode"
            @click="toggleCreationMode"
          >
            Add interval
          </button>
        </div>
      </div>
      <p class="timeline-help" role="status">
        <template v-if="pendingBoundaryMinute !== null">
          Boundary at {{ formatMinute(pendingBoundaryMinute) }}.
          <template v-if="canInsertActivity">
            Tap another time on the margin, or tap the filled/unfilled slot
            above or below the line.
          </template>
          <template v-else>
            Select tags above, then choose the other side.
          </template>
          <button type="button" class="cancel-creation" @click="cancelCreation">
            Cancel
          </button>
        </template>
        <template v-else-if="creationMode">
          Tap two times on the time margin to choose the interval. Swipe the
          margin to scroll without making a change.
        </template>
        <template v-else-if="adjustMode">
          Tap filled or unfilled time to edit its tags; drag a broad surface to
          move its trailing boundary. Choose Add interval to create exact time.
        </template>
        <template v-else>
          Swipe to move through the day. Tap filled or unfilled time to edit its
          tags. Choose Adjust times to move boundaries.
        </template>
      </p>
      <div
        ref="timeAxisAreaRef"
        class="time-axis-area"
        :class="{ 'creating-interval': creationMode }"
        :title="
          creationMode ? 'Choose an interval boundary' : 'Scroll the timeline'
        "
        @click="handleTimeAxisAreaClick"
      >
        <div
          v-if="pendingBoundaryMinute !== null"
          class="creation-boundary-axis"
          :style="{ top: pendingBoundaryMinute + 'px' }"
        ></div>
        <div
          v-for="hour in hours"
          :key="hour"
          class="time-axis-mark"
          :style="{ top: hour * 60 + 'px' }"
        >
          <span class="time-text">{{
            useTimeFormatter(hour).formattedTime
          }}</span>
          <span class="tick-mark"></span>
        </div>
      </div>
      <div class="activity-list">
        <button
          v-for="gap in unfilledSlots"
          :key="`${gap.start}-${gap.end}`"
          type="button"
          class="timeline-gap"
          :class="{
            selectable: pendingBoundaryMinute !== null,
            adjusting: adjustMode,
          }"
          :data-gap-start="gap.start"
          :data-gap-end="gap.end"
          :style="{
            top: gap.start + 'px',
            height: gap.end - gap.start + 'px',
          }"
          :aria-label="`Edit unfilled time ${formatMinute(gap.start)} to ${formatMinute(gap.end)}`"
          :title="
            pendingBoundaryMinute !== null
              ? 'Use this side of the pending boundary'
              : adjustMode
                ? 'Tap to set tags; drag to adjust the end of this unfilled time'
                : 'Tap to set tags'
          "
          @click="handleSlotClick(gap.start, gap.end, $event)"
        >
          <span v-if="gap.end - gap.start >= 30">Unfilled</span>
        </button>
        <ActivityItem
          v-for="activity in activities"
          :key="activity.id"
          :activity="activity"
          :title="activityStore.titleForSelection(activity.tagIds)"
          :time-label="`${formatMinute(activity.start_time_minutes)} to ${formatMinute(activity.start_time_minutes + activity.duration_minutes)}`"
          :adjusting="adjustMode"
          :click-to-edit="!adjustMode"
          class="activity-item"
          :style="{
            top: activity.start_time_minutes + 'px',
            height: activity.duration_minutes + 'px',
          }"
          @edit="handleActivityTap"
        />
        <div
          v-if="pendingBoundaryMinute !== null"
          class="creation-boundary"
          :style="{ top: pendingBoundaryMinute + 'px' }"
        ></div>
      </div>
      <ActivityTagEditor
        v-if="editingActivity"
        :key="`activity-${editingActivity.id}`"
        :activity="editingActivity"
        @close="closeTimelineEditor"
      />
      <ActivityTagEditor
        v-else-if="editingGap"
        :key="`gap-${editingGap.date}-${editingGap.start}-${editingGap.end}`"
        :gap="editingGap"
        :initial-tag-ids="selectedTagIds"
        @close="closeTimelineEditor"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useDragAndDrop } from "../composable/useDragAndDrop";
import { useTimeFormatter } from "../composable/useTimeFormatter";
import { buildTodayReceipt } from "../function/buildTodayReceipt";
import {
  addLocalDays,
  getLocalDayAtMs,
  getLocalMinuteOfDay,
  localDateFromString,
} from "../function/localCalendar";
import { isValidSelection, normalizeSelection } from "../function/tagSelection";
import { useActivityStore } from "../store/activity";
import ActivityItem from "../component/ActivityItem.vue";
import ActivityTagEditor from "../component/ActivityTagEditor.vue";
import CapturePanel from "../component/CapturePanel.vue";
import TodayReceipt from "../component/TodayReceipt.vue";
import TagPicker from "../component/TagPicker.vue";

export default {
  name: "DayView",
  components: {
    ActivityItem,
    ActivityTagEditor,
    CapturePanel,
    RouterLink,
    TagPicker,
    TodayReceipt,
  },
  props: {
    section: {
      type: String,
      default: "combined",
    },
    selectedDate: {
      type: String,
      default: undefined,
    },
    browseFirst: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["select-date"],
  setup(props, { emit }) {
    const activityStore = useActivityStore();
    const nowMs = ref(Date.now());
    const currentDate = computed(() => getLocalDayAtMs(nowMs.value));
    const localTimelineDate = ref<string | undefined>(undefined);
    const timelineDate = computed(
      () => props.selectedDate ?? localTimelineDate.value ?? currentDate.value,
    );
    const isToday = computed(() => timelineDate.value === currentDate.value);
    const adjustMode = ref(!props.browseFirst);
    const creationMode = ref(false);
    activityStore.reconcileRunning(nowMs.value);
    const selectedTagIds = ref(
      normalizeSelection(
        activityStore.runningActivity?.tagIds ??
          activityStore.recentTagSelections[0] ??
          [],
        activityStore.tagGroups,
      ),
    );
    const canInsertActivity = computed(() =>
      isValidSelection(selectedTagIds.value, activityStore.tagGroups, true),
    );
    const activities = computed(() =>
      activityStore.getActivitiesForDay(timelineDate.value),
    );
    const todayActivities = computed(() =>
      activityStore.getActivitiesForDay(currentDate.value),
    );
    const timelineDateLabel = computed(() => {
      const date = localDateFromString(timelineDate.value);
      if (!date) return timelineDate.value;
      const label = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() === new Date(nowMs.value).getFullYear()
            ? undefined
            : "numeric",
      }).format(date);
      return isToday.value ? `Today, ${label}` : label;
    });
    const unfilledSlots = computed(() => {
      const gaps: Array<{ start: number; end: number }> = [];
      let cursor = 0;
      for (const activity of activities.value) {
        const start = Math.max(0, Math.min(1440, activity.start_time_minutes));
        const end = Math.max(
          start,
          Math.min(1440, start + activity.duration_minutes),
        );
        if (start > cursor) gaps.push({ start: cursor, end: start });
        cursor = Math.max(cursor, end);
      }
      if (cursor < 1440) gaps.push({ start: cursor, end: 1440 });
      return gaps;
    });
    const pendingBoundaryMinute = ref<number | null>(null);
    const editingActivityId = ref<number | null>(null);
    const editingGap = ref<{
      start: number;
      end: number;
      date: string;
    } | null>(null);
    const dayHeadingRef = ref<HTMLElement | null>(null);
    const timeAxisAreaRef = ref<HTMLElement | null>(null);
    let editorTrigger: HTMLElement | null = null;

    function clientYToMinute(clientY: number, snap: boolean) {
      const axis = timeAxisAreaRef.value;
      if (!axis) return null;
      const rect = axis.getBoundingClientRect();
      if (rect.height <= 0) return null;
      const rawMinute = ((clientY - rect.top) / rect.height) * 1440;
      const minute = snap ? Math.round(rawMinute / 15) * 15 : rawMinute;
      return Math.max(0, Math.min(1440, minute));
    }

    function completeInterval(start: number, end: number) {
      if (
        !canInsertActivity.value ||
        !activityStore.replaceActivityInterval(
          start,
          end,
          timelineDate.value,
          selectedTagIds.value,
        )
      )
        return;
      pendingBoundaryMinute.value = null;
      creationMode.value = false;
    }

    function handleTimeAxisAreaClick(event: MouseEvent) {
      if (!creationMode.value) return;
      const minute = clientYToMinute(event.clientY, true);
      if (minute === null) return;
      if (pendingBoundaryMinute.value === null) {
        pendingBoundaryMinute.value = minute;
        return;
      }
      completeInterval(
        Math.min(pendingBoundaryMinute.value, minute),
        Math.max(pendingBoundaryMinute.value, minute),
      );
    }

    function completeFromSlot(
      slotStart: number,
      slotEnd: number,
      clickedMinute: number,
    ) {
      const boundary = pendingBoundaryMinute.value;
      if (boundary === null || boundary < slotStart || boundary > slotEnd)
        return;
      if (boundary === slotEnd || clickedMinute < boundary) {
        completeInterval(slotStart, boundary);
      } else {
        completeInterval(boundary, slotEnd);
      }
    }

    function handleGapTap(
      slotStart: number,
      slotEnd: number,
      clientY?: number,
      trigger?: HTMLElement,
    ) {
      if (pendingBoundaryMinute.value === null) {
        editorTrigger = trigger ?? null;
        editingGap.value = {
          start: slotStart,
          end: slotEnd,
          date: timelineDate.value,
        };
        return;
      }
      const clickedMinute =
        clientY === undefined
          ? pendingBoundaryMinute.value === slotEnd
            ? slotEnd - 1
            : pendingBoundaryMinute.value + 1
          : clientYToMinute(clientY, false);
      if (clickedMinute !== null)
        completeFromSlot(slotStart, slotEnd, clickedMinute);
    }

    function handleSlotClick(
      slotStart: number,
      slotEnd: number,
      event: MouseEvent,
    ) {
      if (adjustMode.value && event.detail !== 0) return;
      handleGapTap(
        slotStart,
        slotEnd,
        undefined,
        event.currentTarget as HTMLElement,
      );
    }

    function cancelCreation() {
      pendingBoundaryMinute.value = null;
      creationMode.value = false;
    }

    function toggleCreationMode() {
      if (creationMode.value) cancelCreation();
      else creationMode.value = true;
    }

    function formatMinute(minute: number) {
      const bounded = Math.max(0, Math.min(1440, minute));
      const hours = Math.floor(bounded / 60);
      const minutes = Math.round(bounded % 60);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    }

    function openActivityEditor(activityId: number) {
      const activity = activityStore.activities.find(
        (candidate) => candidate.id === activityId,
      );
      if (!activity) return;
      editorTrigger = document.querySelector(
        `[data-activity-id="${activityId}"]`,
      );
      editingGap.value = null;
      editingActivityId.value = activityId;
    }

    function handleActivityTap(activityId: number, clientY?: number) {
      if (pendingBoundaryMinute.value === null) {
        openActivityEditor(activityId);
        return;
      }
      const activity = activityStore.activities.find(
        (candidate) => candidate.id === activityId,
      );
      if (!activity) return;
      const start = activity.start_time_minutes;
      const end = start + activity.duration_minutes;
      const clickedMinute =
        clientY === undefined
          ? pendingBoundaryMinute.value === end
            ? end - 1
            : pendingBoundaryMinute.value + 1
          : clientYToMinute(clientY, false);
      if (clickedMinute !== null) completeFromSlot(start, end, clickedMinute);
    }

    async function closeTimelineEditor() {
      editingActivityId.value = null;
      editingGap.value = null;
      await nextTick();
      if (editorTrigger?.isConnected) editorTrigger.focus();
      else dayHeadingRef.value?.focus();
      editorTrigger = null;
    }

    useDragAndDrop(timelineDate, handleActivityTap, handleGapTap, adjustMode);

    const editingActivity = computed(
      () =>
        activityStore.activities.find(
          (activity) => activity.id === editingActivityId.value,
        ) ?? null,
    );
    const todayReceipt = computed(() =>
      buildTodayReceipt({
        activities: todayActivities.value,
        runningActivity: activityStore.runningActivity,
        tagGroups: activityStore.tagGroups,
        day: currentDate.value,
        nowMs: nowMs.value,
      }),
    );
    function selectRecentForCorrection(tagIds: string[]) {
      selectedTagIds.value = [...tagIds];
    }

    function clearTimelineInteraction() {
      pendingBoundaryMinute.value = null;
      creationMode.value = false;
      editingActivityId.value = null;
      editingGap.value = null;
      editorTrigger = null;
    }

    function selectTimelineDate(date: string) {
      if (!localDateFromString(date) || date === timelineDate.value) return;
      clearTimelineInteraction();
      if (props.section !== "timeline") localTimelineDate.value = date;
      emit("select-date", date);
    }

    function selectDateOffset(offset: number) {
      const date = addLocalDays(timelineDate.value, offset);
      if (date) selectTimelineDate(date);
    }

    function scrollToMinute(minute: number, behavior: ScrollBehavior) {
      const axis = timeAxisAreaRef.value;
      if (!axis) return;
      const axisTop = axis.getBoundingClientRect().top + window.scrollY;
      const viewportOffset = Math.min(window.innerHeight * 0.35, 280);
      window.scrollTo({
        top: Math.max(0, axisTop + minute - viewportOffset),
        behavior,
      });
    }

    function scrollToCurrentTime() {
      scrollToMinute(getLocalMinuteOfDay(new Date(nowMs.value)), "smooth");
    }

    async function scrollToUsefulTime(behavior: ScrollBehavior = "auto") {
      if (props.section !== "timeline") return;
      await nextTick();
      const minute = isToday.value
        ? getLocalMinuteOfDay(new Date(nowMs.value))
        : (activities.value[0]?.start_time_minutes ?? 0);
      scrollToMinute(minute, behavior);
    }

    watch(timelineDate, () => {
      clearTimelineInteraction();
    });
    watch(adjustMode, (enabled) => {
      if (!enabled) cancelCreation();
    });

    const hours = Array.from({ length: 25 }, (_, index) => index);
    let reconcileTimer: ReturnType<typeof setInterval> | undefined;
    const updateNowAndReconcile = () => {
      nowMs.value = Date.now();
      activityStore.reconcileRunning(nowMs.value);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && pendingBoundaryMinute.value !== null) {
        cancelCreation();
      }
    };
    onMounted(() => {
      reconcileTimer = setInterval(updateNowAndReconcile, 1000);
      window.addEventListener("keydown", handleKeyDown);
      void scrollToUsefulTime();
    });
    onUnmounted(() => {
      if (reconcileTimer !== undefined) clearInterval(reconcileTimer);
      window.removeEventListener("keydown", handleKeyDown);
    });
    return {
      activityStore,
      activities,
      unfilledSlots,
      hours,
      useTimeFormatter,
      timeAxisAreaRef,
      nowMs,
      currentDate,
      timelineDateLabel,
      isToday,
      adjustMode,
      creationMode,
      todayReceipt,
      editingActivity,
      editingGap,
      dayHeadingRef,
      selectedTagIds,
      canInsertActivity,
      pendingBoundaryMinute,
      handleTimeAxisAreaClick,
      handleSlotClick,
      handleActivityTap,
      cancelCreation,
      toggleCreationMode,
      formatMinute,
      closeTimelineEditor,
      selectRecentForCorrection,
      selectTimelineDate,
      selectDateOffset,
      scrollToCurrentTime,
    };
  },
};
</script>

<style scoped>
.day-view {
  box-sizing: border-box;
  padding: 20px;
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr);
  max-width: 1200px;
  width: 100%;
}
.day-view h1 {
  margin-bottom: 10px;
  grid-column: 1 / 3;
}
.timeline-tag-picker {
  grid-column: 1 / 3;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-muted);
}
.timeline-tag-picker h2 {
  margin: 0 0 10px;
  font-size: 1rem;
}
.timeline-tag-picker p {
  margin: 0;
}
.timeline-toolbar {
  position: sticky;
  z-index: 5;
  top: 65px;
  grid-column: 1 / 3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
  margin-bottom: 8px;
  background: var(--color-page);
  border-bottom: 1px solid var(--color-border-subtle);
}
.date-navigation {
  display: grid;
  flex: 1 1 18rem;
  grid-template-columns: 40px minmax(9rem, 1fr) 40px;
  align-items: center;
  gap: 6px;
}
.date-actions,
.timeline-mode {
  display: flex;
  align-items: center;
  gap: 6px;
}
.timeline-toolbar button {
  box-sizing: border-box;
  min-height: 40px;
  padding: 6px 10px;
}
.now-action:disabled {
  /* Keep toolbar wrapping stable when browsing away from today. */
  visibility: hidden;
}
.selected-date {
  min-width: 9rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.timeline-mode button[aria-pressed="true"] {
  color: var(--color-current);
  background: var(--color-current-background);
  border-color: var(--color-current);
}
.timeline-help {
  grid-column: 1 / 3;
  margin: 0 0 10px;
  color: var(--color-muted);
  font-size: 0.85rem;
}
.cancel-creation {
  min-height: 32px;
  margin-left: 8px;
}
.time-axis-area {
  position: relative;
  margin-right: 10px;
  cursor: default;
  touch-action: pan-y;
}
.time-axis-area.creating-interval {
  cursor: crosshair;
}
.creation-boundary-axis {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-current);
  pointer-events: none;
}
.time-axis-mark {
  position: absolute;
  left: 0;
  display: flex;
  align-items: center;
  height: 1px;
}
.time-text {
  font-size: 0.8em;
  white-space: nowrap;
  margin-right: 5px;
}
.tick-mark {
  width: 5px;
  height: 1px;
  background-color: var(--color-axis);
}
.activity-list {
  position: relative;
  border: 1px solid var(--color-border);
  min-height: 1440px;
  margin-top: 0;
  min-width: 0;
}
.timeline-gap {
  box-sizing: border-box;
  position: absolute;
  left: 0;
  right: 0;
  padding: 8px 10px;
  border: 1px dashed var(--color-border);
  border-radius: 0;
  color: var(--color-muted);
  background: var(--color-surface-muted);
  text-align: left;
  overflow: hidden;
  user-select: none;
  touch-action: pan-y;
}
.timeline-gap.adjusting {
  touch-action: none;
}
.timeline-gap {
  cursor: pointer;
}
.timeline-gap.selectable {
  z-index: 2;
}
.timeline-gap.selectable:hover {
  border-color: var(--color-current);
}
@media (max-width: 560px) {
  .day-view {
    padding: 12px;
  }
  .timeline-toolbar,
  .date-navigation,
  .timeline-mode {
    width: 100%;
  }
  .date-navigation {
    grid-template-columns: 40px minmax(0, 1fr) 40px;
  }
  .timeline-mode button {
    flex: 1;
  }
  .selected-date {
    min-width: 0;
  }
}
.creation-boundary {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-current);
  pointer-events: none;
}
</style>
