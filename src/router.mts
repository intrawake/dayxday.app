import { createRouter, createWebHashHistory } from "vue-router";
import DayView from "./view/DayView.vue";
import TagsView from "./view/TagsView.vue";
import TimelineView from "./view/TimelineView.vue";

const routes = [
  {
    path: "/",
    name: "DayView",
    component: DayView,
    props: { section: "today" },
  },
  { path: "/timeline/:day?", name: "TimelineView", component: TimelineView },
  { path: "/tags", name: "TagsView", component: TagsView },
];

const router = createRouter({ history: createWebHashHistory(), routes });

export default router;
