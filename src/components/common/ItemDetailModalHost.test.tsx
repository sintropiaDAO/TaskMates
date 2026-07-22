import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

/**
 * Regression guard: ItemDetailModalHost must wire the full set of shared
 * handlers into each detail modal. If a handler is dropped from the host,
 * a modal opened via any legacy caller (Dashboard, Tag pages, etc.) silently
 * loses functionality — as previously happened with poll delete on Tag pages.
 */

// Capture props passed to each modal.
const taskProps = vi.fn();
const productProps = vi.fn();
const pollProps = vi.fn();

vi.mock("@/components/tasks/TaskDetailModal", () => ({
  TaskDetailModal: (props: any) => {
    taskProps(props);
    return null;
  },
}));
vi.mock("@/components/products/ProductDetailModal", () => ({
  ProductDetailModal: (props: any) => {
    productProps(props);
    return null;
  },
}));
vi.mock("@/components/polls/PollDetailModal", () => ({
  PollDetailModal: (props: any) => {
    pollProps(props);
    return null;
  },
}));

// Mock hooks that the host consumes.
const deleteTask = vi.fn(async () => true);
const completeTask = vi.fn(async () => true);
const refreshTasks = vi.fn(async () => {});
vi.mock("@/hooks/useTasks", () => ({
  useTasks: () => ({ deleteTask, completeTask, refreshTasks }),
}));

const deleteProduct = vi.fn(async () => true);
const addParticipant = vi.fn(async () => true);
const refreshProducts = vi.fn(async () => {});
vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({
    deleteProduct,
    addParticipant,
    refreshProducts,
  }),
}));

const deletePoll = vi.fn(async () => {});
const removeVote = vi.fn(async () => {});
const fetchPollHistory = vi.fn(async () => []);
const reopenPoll = vi.fn(async () => {});
const addOption = vi.fn(async () => {});
const deleteOption = vi.fn(async () => {});
const vote = vi.fn(async () => true);
vi.mock("@/hooks/usePolls", () => ({
  usePolls: () => ({
    vote,
    addOption,
    deleteOption,
    deletePoll,
    removeVote,
    fetchPollHistory,
    reopenPoll,
  }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (k: string) => k, language: "pt" }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { ItemDetailModalHost } from "@/components/common/ItemDetailModalHost";

const task = { id: "t1", title: "T" } as any;
const product = { id: "p1", title: "P" } as any;
const poll = { id: "poll1", question: "Q" } as any;

function renderHost(extra: Record<string, any> = {}) {
  return render(
    <ItemDetailModalHost
      selectedTask={task}
      setSelectedTask={vi.fn()}
      selectedProduct={product}
      setSelectedProduct={vi.fn()}
      selectedPoll={poll}
      setSelectedPoll={vi.fn()}
      onEditTask={vi.fn()}
      onEditProduct={vi.fn()}
      onEditPoll={vi.fn()}
      {...extra}
    />,
  );
}

beforeEach(() => {
  taskProps.mockReset();
  productProps.mockReset();
  pollProps.mockReset();
});

describe("ItemDetailModalHost", () => {
  it("wires every canonical task handler", () => {
    renderHost();
    const props = taskProps.mock.calls.at(-1)![0];
    for (const key of [
      "task",
      "open",
      "onClose",
      "onComplete",
      "onRefresh",
      "onEdit",
      "onDelete",
      "onOpenRelatedTask",
      "onOpenProduct",
    ]) {
      expect(props[key], `TaskDetailModal missing ${key}`).toBeDefined();
    }
    expect(props.open).toBe(true);
  });

  it("wires every canonical product handler", () => {
    renderHost();
    const props = productProps.mock.calls.at(-1)![0];
    for (const key of [
      "product",
      "open",
      "onClose",
      "onRefresh",
      "onDelete",
      "onParticipate",
      "onEdit",
    ]) {
      expect(props[key], `ProductDetailModal missing ${key}`).toBeDefined();
    }
  });

  it("wires every canonical poll handler (including delete/reopen/history)", () => {
    renderHost();
    const props = pollProps.mock.calls.at(-1)![0];
    for (const key of [
      "poll",
      "open",
      "onClose",
      "onVote",
      "onAddOption",
      "onDeleteOption",
      "onEdit",
      "onDelete",
      "onRemoveVote",
      "onFetchHistory",
      "onReopenPoll",
      "onRefresh",
    ]) {
      expect(props[key], `PollDetailModal missing ${key}`).toBeDefined();
    }
  });

  it("invokes the shared hook deleters and closes the modal", async () => {
    const setSelectedTask = vi.fn();
    const setSelectedProduct = vi.fn();
    const setSelectedPoll = vi.fn();
    render(
      <ItemDetailModalHost
        selectedTask={task}
        setSelectedTask={setSelectedTask}
        selectedProduct={product}
        setSelectedProduct={setSelectedProduct}
        selectedPoll={poll}
        setSelectedPoll={setSelectedPoll}
      />,
    );
    await taskProps.mock.calls.at(-1)![0].onDelete("t1");
    expect(deleteTask).toHaveBeenCalledWith("t1");
    expect(setSelectedTask).toHaveBeenCalledWith(null);

    await productProps.mock.calls.at(-1)![0].onDelete("p1");
    expect(deleteProduct).toHaveBeenCalledWith("p1");
    expect(setSelectedProduct).toHaveBeenCalledWith(null);

    await pollProps.mock.calls.at(-1)![0].onDelete("poll1");
    expect(deletePoll).toHaveBeenCalledWith("poll1");
    expect(setSelectedPoll).toHaveBeenCalledWith(null);
  });

  it("omits onEdit when the caller does not opt in", () => {
    render(
      <ItemDetailModalHost
        selectedTask={task}
        setSelectedTask={vi.fn()}
        selectedProduct={product}
        setSelectedProduct={vi.fn()}
        selectedPoll={poll}
        setSelectedPoll={vi.fn()}
      />,
    );
    expect(taskProps.mock.calls.at(-1)![0].onEdit).toBeUndefined();
    expect(productProps.mock.calls.at(-1)![0].onEdit).toBeUndefined();
    expect(pollProps.mock.calls.at(-1)![0].onEdit).toBeUndefined();
  });
});
