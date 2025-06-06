
// src/eventHandlers/modalEventHandlers.ts
import * as Rstate from '../state';
import { renderApp } from '../viewManager';
import type { ConfirmationModalConfig } from '../state';

export function showConfirmationModal(config: ConfirmationModalConfig) {
    Rstate.setConfirmationModalConfig(config);
    Rstate.setIsConfirmationModalVisible(true);
    renderApp(); // Re-render to show the modal
}

export function hideConfirmationModal() {
    Rstate.setIsConfirmationModalVisible(false);
    Rstate.setConfirmationModalConfig(null);
    renderApp(); // Re-render to hide the modal
}

export function handleConfirmModal() {
    if (Rstate.confirmationModalConfig && typeof Rstate.confirmationModalConfig.onConfirm === 'function') {
        Rstate.confirmationModalConfig.onConfirm();
    }
    hideConfirmationModal();
}

export function handleCancelModal() {
    if (Rstate.confirmationModalConfig && typeof Rstate.confirmationModalConfig.onCancel === 'function') {
        Rstate.confirmationModalConfig.onCancel();
    }
    hideConfirmationModal();
}
