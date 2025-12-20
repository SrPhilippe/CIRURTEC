export const ROLES = {
    ADMIN: 'ADMIN',
    MASTER: 'Master',
    PADRAO: 'Padrão'
}

export const PERMISSIONS = {
    // User Management
    MANAGE_USERS: 'MANAGE_USERS',      // General access to users list
    CREATE_USER: 'CREATE_USER',        // Create new users
    EDIT_USER: 'EDIT_USER',            // Edit existing users
    DELETE_USER: 'DELETE_USER',        // Delete users

    // Specific User Fields
    EDIT_USERNAME: 'EDIT_USERNAME',    // Change the username
    EDIT_USER_ROLE: 'EDIT_USER_ROLE',  // Change the role/permissions of a user

    // Client Management
    CREATE_CLIENT: 'CREATE_CLIENT',    // Create new clients
    DELETE_CLIENT: 'DELETE_CLIENT',    // Delete clients
}

/**
 * Checks if the current user has permission to perform an action.
 * 
 * @param {Object} currentUser - The user attempting the action (must contain role).
 * @param {string} permission - The permission identifier (from PERMISSIONS).
 * @param {Object} [targetUser=null] - The user object being acted upon (required for specific user edits/deletes).
 * @returns {boolean} - True if allowed, false otherwise.
 */
export const checkPermission = (currentUser, permission, targetUser = null) => {
    if (!currentUser) return false

    // Normalize role: checking 'rights' (access level) first, then 'role' (legacy/fallback)
    const rawRole = currentUser.rights || currentUser.role || ''
    const role = rawRole.toUpperCase()

    // --- ADMIN Permissions ---
    // Admin can alter everything.
    // Normalized check: user might have role 'ADMIN', 'admin', 'Admin'
    if (role === 'ADMIN') {
        return true
    }

    // --- MASTER Permissions ---
    // Normalized check: 'MASTER' or 'Master' (case insensitive check covers it)
    if (role === 'MASTER') {
        switch (permission) {
            case PERMISSIONS.MANAGE_USERS:
            case PERMISSIONS.CREATE_USER:
                return true // Assuming Master can create users if they can edit/delete (except Admin)

            case PERMISSIONS.EDIT_USER:
                return true

            case PERMISSIONS.EDIT_USERNAME:
                return false // "Não pode alterar o username do usuário"

            case PERMISSIONS.EDIT_USER_ROLE:
                return false // Only Admin can change permissions

            case PERMISSIONS.DELETE_USER:
                // "Pode excluir a conta de qualquer usuário exceto de um ADMIN"
                if (targetUser) {
                    const targetRole = (targetUser.role || targetUser.rights || '').toUpperCase()
                    if (targetRole === 'ADMIN') {
                        return false
                    }
                }
                return true

            case PERMISSIONS.CREATE_CLIENT:
                return true

            case PERMISSIONS.DELETE_CLIENT:
                // Error report: "Master... não consegue deletar clientes."
                // Wait, request said: "Padrão... Não consegue deletar clientes."
                // Implied Master CAN delete clients?
                // Request said: "Master: Pode editar usuários... Pode excluir a conta de qualquer usuário..."
                // It didn't explicitly forbid deleting clients for Master, so we assume TRUE.
                return true

            default:
                return false
        }
    }

    // --- PADRÃO Permissions ---
    // Normalized check: 'PADRAO', 'PADRÃO', 'Padrão'
    // Handling potential encoding issues with Ã
    if (role === 'PADRAO' || role === 'PADRÃO' || role === 'PADRÃ£O') {
        switch (permission) {
            case PERMISSIONS.CREATE_CLIENT:
                return true // "consegue criar novos clientes"

            case PERMISSIONS.DELETE_CLIENT:
                return false // "Não consegue deletar clientes"

            case PERMISSIONS.MANAGE_USERS:
            case PERMISSIONS.CREATE_USER:
                return false // "não pode criar usuários", "Não consegue editar usuários" (implies no list access too?)

            case PERMISSIONS.EDIT_USER:
                // "só pode alterar sua própria senha e seu próprio e-mail"
                // This is a special case: editing SELF is allowed, but only specific fields.
                // We'll return TRUE here if it's self, but UI must restrict specific fields (Username/Role)
                // using EDIT_USERNAME and EDIT_USER_ROLE checks.
                return targetUser && targetUser.id === currentUser.id

            case PERMISSIONS.DELETE_USER:
                return false // Cannot delete users (even self? Usually self-delete is separate, but assuming "Não consegue deletar usuários")

            case PERMISSIONS.EDIT_USERNAME:
                return false // Only email and password logic applies to "only can alter..."

            case PERMISSIONS.EDIT_USER_ROLE:
                return false

            default:
                return false
        }
    }

    // Fallback if role is not recognized
    return false
}
