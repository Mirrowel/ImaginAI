
// src/ui/confirmationModalRenderer.ts
import * as state from '../state';
import { escapeHTML } from '../utils';
import { handleConfirmModal, handleCancelModal } from '../eventHandlers/index'; // Will use modalEventHandlers

export function renderConfirmationModal() {
    const modalContainer = document.getElementById('confirmation-modal-container');
    if (!modalContainer) return;

    if (!state.isConfirmationModalVisible || !state.confirmationModalConfig) {
        modalContainer.innerHTML = '';
        return;
    }

    const { title, message, confirmText = 'Confirm', cancelText = 'Cancel' } = state.confirmationModalConfig;

    modalContainer.innerHTML = `
        <div class="confirmation-modal-overlay" id="confirmation-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-heading" aria-describedby="confirmation-modal-message">
            <div class="confirmation-modal">
                <h2 id="confirmation-modal-heading">${escapeHTML(title)}</h2>
                <p id="confirmation-modal-message">${escapeHTML(message)}</p>
                <div class="confirmation-modal-actions">
                    <button type="button" id="confirm-modal-cancel-btn" class="secondary">${escapeHTML(cancelText)}</button>
                    <button type="button" id="confirm-modal-confirm-btn" class="danger">${escapeHTML(confirmText)}</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('confirm-modal-confirm-btn')?.addEventListener('click', handleConfirmModal);
    document.getElementById('confirm-modal-cancel-btn')?.addEventListener('click', handleCancelModal);
    document.getElementById('confirmation-modal-overlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) { // Click on overlay itself
            handleCancelModal();
        }
    });

    // Focus the confirm button by default
    setTimeout(() => {
        document.getElementById('confirm-modal-confirm-btn')?.focus();
    }, 0);
}
