// src/lib/auth.ts
import { Alert, Platform } from 'react-native';

/**
 * Logout handler
 */
export async function handleLogout(onSuccess?: () => void) {
    onSuccess?.();
}

function showWebLogoutConfirm(onSuccess?: () => void) {
    if (typeof document === 'undefined') {
        return;
    }

    const existing = document.getElementById('__bat_logout_confirm__');
    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = '__bat_logout_confirm__';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.38)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const modal = document.createElement('div');
    modal.style.width = 'min(92vw, 360px)';
    modal.style.background = '#FFFFFF';
    modal.style.borderRadius = '14px';
    modal.style.padding = '20px 18px 16px';
    modal.style.boxSizing = 'border-box';
    modal.style.boxShadow = '0 16px 42px rgba(0,0,0,0.22)';
    modal.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

    const title = document.createElement('div');
    title.textContent = '\uB85C\uADF8\uC544\uC6C3';
    title.style.fontSize = '18px';
    title.style.fontWeight = '700';
    title.style.marginBottom = '10px';
    title.style.color = '#111827';

    const message = document.createElement('div');
    message.textContent = '\uC815\uB9D0 \uB85C\uADF8\uC544\uC6C3\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?';
    message.style.fontSize = '14px';
    message.style.color = '#374151';
    message.style.marginBottom = '16px';

    const buttonRow = document.createElement('div');
    buttonRow.style.display = 'flex';
    buttonRow.style.gap = '8px';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.textContent = '\uCDE8\uC18C';
    cancelButton.style.flex = '1';
    cancelButton.style.height = '40px';
    cancelButton.style.border = '1px solid #D1D5DB';
    cancelButton.style.borderRadius = '10px';
    cancelButton.style.background = '#FFFFFF';
    cancelButton.style.color = '#111827';
    cancelButton.style.fontSize = '14px';
    cancelButton.style.cursor = 'pointer';

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.textContent = '\uB85C\uADF8\uC544\uC6C3';
    logoutButton.style.flex = '1';
    logoutButton.style.height = '40px';
    logoutButton.style.border = '0';
    logoutButton.style.borderRadius = '10px';
    logoutButton.style.background = '#EF4444';
    logoutButton.style.color = '#FFFFFF';
    logoutButton.style.fontSize = '14px';
    logoutButton.style.fontWeight = '700';
    logoutButton.style.cursor = 'pointer';

    const closeModal = () => {
        overlay.remove();
    };

    cancelButton.onclick = () => {
        closeModal();
    };

    logoutButton.onclick = () => {
        closeModal();
        void handleLogout(onSuccess);
    };

    overlay.onclick = (event: MouseEvent) => {
        if (event.target === overlay) {
            closeModal();
        }
    };

    buttonRow.appendChild(cancelButton);
    buttonRow.appendChild(logoutButton);
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(buttonRow);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

/**
 * Logout confirmation dialog
 */
export function confirmLogout(onSuccess?: () => void) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        showWebLogoutConfirm(onSuccess);
        return;
    }

    Alert.alert(
        '\uB85C\uADF8\uC544\uC6C3',
        '\uC815\uB9D0 \uB85C\uADF8\uC544\uC6C3\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?',
        [
            {
                text: '\uCDE8\uC18C',
                style: 'cancel'
            },
            {
                text: '\uB85C\uADF8\uC544\uC6C3',
                onPress: () => {
                    void handleLogout(onSuccess);
                },
                style: 'destructive'
            }
        ]
    );
}
