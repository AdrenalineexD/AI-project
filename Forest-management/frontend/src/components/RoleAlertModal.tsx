import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Bell, X } from "lucide-react";
import type { Alert, Role } from "../types";

interface RoleAlertModalProps {
  alerts: Alert[];
  userRole: Role;
}

/**
 * Shows a full-screen modal for the highest-priority alert addressed to
 * the current user's role. Only fires for HIGH / CRITICAL alerts.
 */
export const RoleAlertModal: React.FC<RoleAlertModalProps> = ({ alerts, userRole }) => {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const relevant = alerts.find(
    (a) =>
      a.role === userRole &&
      (a.priority === "HIGH" || a.priority === "CRITICAL") &&
      !dismissed.has(a.id)
  );

  // Auto-dismiss after 20 seconds
  useEffect(() => {
    if (!relevant) return;
    const t = setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(relevant.id));
    }, 20000);
    return () => clearTimeout(t);
  }, [relevant]);

  return (
    <AnimatePresence>
      {relevant && (
        <motion.div
          className="wf-alert-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setDismissed((prev) => new Set(prev).add(relevant.id))}
        >
          <motion.div
            className="wf-alert-modal"
            data-priority={relevant.priority}
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wf-alert-modal-head">
              <div className="wf-alert-modal-icon">
                {relevant.priority === "CRITICAL" ? (
                  <AlertTriangle size={22} />
                ) : (
                  <Bell size={22} />
                )}
              </div>
              <div className="wf-alert-modal-meta">
                <div className="wf-alert-modal-priority">{relevant.priority}</div>
                <div className="wf-alert-modal-role">{relevant.role}</div>
              </div>
              <button
                className="wf-alert-modal-close"
                onClick={() => setDismissed((prev) => new Set(prev).add(relevant.id))}
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>

            <div className="wf-alert-modal-title">{relevant.title}</div>
            <pre className="wf-alert-modal-body">{relevant.body}</pre>

            <div className="wf-alert-modal-actions">
              {relevant.actions.map((a) => (
                <button
                  key={a}
                  className="wf-btn small"
                  onClick={() => setDismissed((prev) => new Set(prev).add(relevant.id))}
                >
                  {a.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};