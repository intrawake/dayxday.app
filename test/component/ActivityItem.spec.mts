import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ActivityItem from "@/component/ActivityItem.vue";

describe("ActivityItem", () => {
  const activity = {
    id: 1,
    tagIds: ["office", "focus"],
    start_time_minutes: 0,
    duration_minutes: 60,
    date: "2024-05-10",
  };

  it("renders the derived title and keeps the broad drag surface", () => {
    const wrapper = mount(ActivityItem, {
      props: {
        activity,
        title: "Office · Focus",
        timeLabel: "00:00 to 01:00",
      },
    });
    expect(wrapper.text()).toBe("Office · Focus");
    expect(wrapper.attributes("data-activity-id")).toBe("1");
    expect(wrapper.classes()).toContain("activity-item");
    expect(wrapper.attributes("aria-label")).toBe(
      "Edit 00:00 to 01:00: Office · Focus",
    );
  });

  it("does not imply free-form editing or emit rename", async () => {
    const wrapper = mount(ActivityItem, {
      props: {
        activity,
        title: "Office · Focus",
        timeLabel: "00:00 to 01:00",
      },
    });
    await wrapper.trigger("dblclick");
    expect(wrapper.attributes("contenteditable")).toBeUndefined();
    expect(wrapper.emitted("rename")).toBeUndefined();
  });
});
