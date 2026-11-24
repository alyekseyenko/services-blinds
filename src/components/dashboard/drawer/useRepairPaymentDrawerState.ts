"use client";

import { useCallback, useState } from "react";
import type { RepairPaymentMethodId } from "@/lib/visits/repairPayment";

export function useRepairPaymentDrawerState() {
  const [repairPayments, setRepairPayments] = useState<Record<string, RepairPaymentMethodId>>({});
  const [repairPaymentDetails, setRepairPaymentDetails] = useState<Record<string, string>>({});
  const [repairPaymentAmounts, setRepairPaymentAmounts] = useState<Record<string, string>>({});
  const [repairPaymentAmountConfirmed, setRepairPaymentAmountConfirmed] = useState<Record<string, number>>(
    {}
  );
  const [repairPaymentAmountRevisedFrom, setRepairPaymentAmountRevisedFrom] = useState<
    Record<string, number>
  >({});
  const [repairPaymentAmountLocked, setRepairPaymentAmountLocked] = useState<Record<string, boolean>>({});

  const confirmRepairPaymentAmount = useCallback((opportunityId: string, exVatEuros: number) => {
    setRepairPaymentAmountConfirmed((prev) => {
      const prior = prev[opportunityId];
      if (prior != null && Math.abs(prior - exVatEuros) > 0.000_1) {
        setRepairPaymentAmountRevisedFrom((revised) => ({ ...revised, [opportunityId]: prior }));
      }
      return { ...prev, [opportunityId]: exVatEuros };
    });
    setRepairPaymentAmountLocked((prev) => ({ ...prev, [opportunityId]: true }));
  }, []);

  const unlockRepairPaymentAmount = useCallback((opportunityId: string) => {
    setRepairPaymentAmountLocked((prev) => ({ ...prev, [opportunityId]: false }));
  }, []);

  const touchRepairPaymentAmountInput = useCallback((opportunityId: string) => {
    setRepairPaymentAmountLocked((prev) => (prev[opportunityId] ? { ...prev, [opportunityId]: false } : prev));
  }, []);

  return {
    repairPayments,
    setRepairPayments,
    repairPaymentDetails,
    setRepairPaymentDetails,
    repairPaymentAmounts,
    setRepairPaymentAmounts,
    repairPaymentAmountConfirmed,
    repairPaymentAmountRevisedFrom,
    repairPaymentAmountLocked,
    confirmRepairPaymentAmount,
    unlockRepairPaymentAmount,
    touchRepairPaymentAmountInput,
  };
}