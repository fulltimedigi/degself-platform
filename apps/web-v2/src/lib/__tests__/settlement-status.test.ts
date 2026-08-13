import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTO_CONFIRM_DAYS,
  autoConfirmTransition,
  computeAutoConfirmAfter,
  customerReplyTransition,
  isCustomerMutable,
  isDueForAutoConfirm,
  isTerminalSettlement,
  reconcileGarageReport,
} from "../settlement-status";

const T0 = "2026-08-13T10:00:00.000Z";
const t0 = Date.parse(T0);
const DAY = 24 * 60 * 60 * 1000;

test("computeAutoConfirmAfter adds the window", () => {
  assert.equal(
    computeAutoConfirmAfter(T0),
    new Date(t0 + AUTO_CONFIRM_DAYS * DAY).toISOString()
  );
  assert.throws(() => computeAutoConfirmAfter("not-a-date"));
});

test("isDueForAutoConfirm: only pending rows, only past the window", () => {
  const after = computeAutoConfirmAfter(T0);
  assert.equal(isDueForAutoConfirm("pending_settlement", after, t0 + 1 * DAY), false);
  assert.equal(isDueForAutoConfirm("pending_settlement", after, t0 + 6 * DAY), true);
  // terminal / disputed never auto-confirm
  assert.equal(isDueForAutoConfirm("completed_confirmed", after, t0 + 9 * DAY), false);
  assert.equal(isDueForAutoConfirm("no_show", after, t0 + 9 * DAY), false);
  assert.equal(isDueForAutoConfirm("disputed", after, t0 + 9 * DAY), false);
});

test("customer is the arbiter: yes → completed, no → no_show", () => {
  assert.deepEqual(customerReplyTransition("pending_settlement", null, true), {
    status: "completed_confirmed",
    completion_source: "customer",
  });
  assert.deepEqual(customerReplyTransition("pending_settlement", null, false), {
    status: "no_show",
    completion_source: "customer",
  });
});

test("customer may override an 'auto' (silence-presumed) completion, but not a human one", () => {
  // A late "no" rebuts the silence presumption.
  assert.deepEqual(
    customerReplyTransition("completed_confirmed", "auto", false),
    { status: "no_show", completion_source: "customer" }
  );
  assert.deepEqual(
    customerReplyTransition("completed_confirmed", "auto", true),
    { status: "completed_confirmed", completion_source: "customer" }
  );
  // A customer-/admin-settled completion is NOT overridable by a later reply.
  assert.equal(customerReplyTransition("completed_confirmed", "customer", false), null);
  assert.equal(customerReplyTransition("no_show", "customer", true), null);
  // A disputed row is admin-only.
  assert.equal(customerReplyTransition("disputed", "garage", false), null);
});

test("isCustomerMutable: pending or auto-completed only", () => {
  assert.equal(isCustomerMutable("pending_settlement", null), true);
  assert.equal(isCustomerMutable("completed_confirmed", "auto"), true);
  assert.equal(isCustomerMutable("completed_confirmed", "customer"), false);
  assert.equal(isCustomerMutable("no_show", "customer"), false);
  assert.equal(isCustomerMutable("disputed", "garage"), false);
});

test("terminal settlements are immutable (idempotent replay)", () => {
  assert.equal(isTerminalSettlement("completed_confirmed"), true);
  assert.equal(isTerminalSettlement("no_show"), true);
  assert.equal(isTerminalSettlement("pending_settlement"), false);
  assert.equal(customerReplyTransition("no_show", "customer", false), null);
});

test("auto-confirm only advances a pending row, to completed via 'auto'", () => {
  assert.deepEqual(autoConfirmTransition("pending_settlement"), {
    status: "completed_confirmed",
    completion_source: "auto",
  });
  assert.equal(autoConfirmTransition("completed_confirmed"), null);
  assert.equal(autoConfirmTransition("disputed"), null);
});

test("garage report never overrides the customer; conflict → disputed", () => {
  // Garage 'not_completed' contradicting a customer-confirmed completion → dispute.
  assert.deepEqual(
    reconcileGarageReport("completed_confirmed", true, "not_completed"),
    { status: "disputed", completion_source: "garage" }
  );
  // Garage 'completed' cannot revive/flip a settled no_show.
  assert.equal(reconcileGarageReport("no_show", false, "completed"), null);
  // A garage 'not_completed' can never self-close a pending job with no customer.
  assert.equal(reconcileGarageReport("pending_settlement", null, "not_completed"), null);
  assert.equal(reconcileGarageReport("pending_settlement", null, "completed"), null);
  // A disputed row is admin-only — the garage cannot move it.
  assert.equal(reconcileGarageReport("disputed", true, "completed"), null);
  assert.equal(reconcileGarageReport("disputed", false, "not_completed"), null);
});
