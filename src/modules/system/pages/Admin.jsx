import React, { useState } from 'react';
import DashboardLayout from '../../dashboard/layout/DashboardLayout';
import { FaPlus, FaEdit, FaTrash, FaUserShield, FaUsers, FaKey, FaShieldAlt, FaSave, FaUndo } from 'react-icons/fa';
import PageHeader from '../../../components/common/PageHeader';
import SearchInput from '../../../components/common/SearchInput';
import Pagination from '../../../components/common/Pagination';
import StatusBadge from '../../../components/common/StatusBadge';
import GlassModal from '../../../components/common/GlassModal';
import { FormInput, FormSelect } from '../../../components/common/FormField';
import SearchableSelect from '../../../components/common/SearchableSelect';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { PERMISSION_GROUPS, ALL_PAGES } from '../../../config/permissions';
import api from '../../../config/api';
import useApi from '../../../hooks/useApi';
import { fmtDate } from '../../../utils/format';

const SUPER = 'Super Admin';
const COLS = ['view', 'create', 'edit', 'delete', 'print'];
const COL_LABEL = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete', print: 'Print/Export' };
const applies = (pg, action) => action === 'view' || pg.actions.includes(action);

const toDraft = (perms) => {
  const p = {};
  ALL_PAGES.forEach((pg) => {
    const src = (perms && perms[pg.key]) || {};
    const row = {};
    COLS.forEach((c) => { row[c] = applies(pg, c) ? !!src[c] : false; });
    if (!row.view) COLS.forEach((c) => { row[c] = false; });
    p[pg.key] = row;
  });
  return p;
};

const emptyUserForm = { full_name: '', username: '', password: '', role_id: '', status: 'Active' };
const roleColor = { [SUPER]: 'red', 'Branch Manager': 'blue', 'Pharmacist': 'purple', 'Cashier': 'green' };
const thCls = 'px-2 py-2 text-white text-[12px] font-medium uppercase tracking-wider whitespace-nowrap';

const Admin = () => {
  const { can, user, refreshUser } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('users');

  const canCreate = can('admin', 'create');
  const canEdit = can('admin', 'edit');
  const canDelete = can('admin', 'delete');

  const tabs = [
    { id: 'users', label: 'Users', icon: <FaUsers size={12} /> },
    { id: 'roles', label: 'Roles', icon: <FaUserShield size={12} /> },
    { id: 'permissions', label: 'Permissions', icon: <FaKey size={12} /> },
  ];

  const { data: usersData, loading: usersLoading, error: usersError, reload: reloadUsers } = useApi('/admin/users');
  const { data: rolesData, loading: rolesLoading, error: rolesError, reload: reloadRoles } = useApi('/admin/roles');
  const users = Array.isArray(usersData) ? usersData : [];
  const roles = Array.isArray(rolesData) ? rolesData : [];
  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);

  const q = searchTerm.toLowerCase();
  const filtered = users.filter((u) =>
    (u.full_name || '').toLowerCase().includes(q) ||
    (u.username || '').toLowerCase().includes(q) ||
    (u.role || '').toLowerCase().includes(q)
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filtered.slice(startIndex, startIndex + itemsPerPage);
  const isSelf = (u) => !!user && u && u.id === user.id;

  const closeUserModal = () => { setShowUserModal(false); setEditingUser(null); setUserForm(emptyUserForm); };
  const handleAddUser = () => {
    if (!canCreate) return;
    setEditingUser(null);
    const def = roles.find((r) => r.name !== SUPER) || roles[0];
    setUserForm({ ...emptyUserForm, role_id: def ? def.id : '' });
    setShowUserModal(true);
  };
  const handleEditUser = (u) => {
    if (!canEdit) return;
    setEditingUser(u);
    setUserForm({ full_name: u.full_name || '', username: u.username || '', password: '', role_id: u.role_id || '', status: u.status || 'Active' });
    setShowUserModal(true);
  };
  const handleDeleteUser = async (u) => {
    if (!canDelete || isSelf(u)) return;
    if (!window.confirm(`Delete user "${u.full_name}" (@${u.username})?`)) return;
    try {
      const { message } = await api.del(`/admin/users/${u.id}`);
      toast.success(message || 'User deleted');
      reloadUsers(); reloadRoles();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };
  const handleSaveUser = async () => {
    if (!userForm.full_name.trim()) { toast.error('Full name is required', 'Enter the full name'); return; }
    if (!userForm.username.trim()) { toast.error('Username is required', 'Enter the username'); return; }
    if (/\s/.test(userForm.username.trim())) { toast.error('Invalid username', 'Username cannot contain spaces'); return; }
    if (!editingUser && !userForm.password.trim()) { toast.error('Password is required', 'Enter a password for the new user'); return; }
    if (!userForm.role_id) { toast.error('Role is required', 'Select a role'); return; }
    const body = {
      full_name: userForm.full_name.trim(),
      username: userForm.username.trim(),
      role_id: userForm.role_id,
      status: editingUser && isSelf(editingUser) ? 'Active' : userForm.status,
    };
    if (userForm.password.trim()) body.password = userForm.password.trim();
    setSavingUser(true);
    try {
      const { message } = editingUser
        ? await api.put(`/admin/users/${editingUser.id}`, body)
        : await api.post('/admin/users', body);
      toast.success(message || 'User saved');
      closeUserModal();
      reloadUsers(); reloadRoles();
      if (editingUser && isSelf(editingUser)) refreshUser().catch(() => {});
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSavingUser(false);
    }
  };

  const [permRoleId, setPermRoleId] = useState(null);
  const permRole = roles.find((r) => r.id === permRoleId) || roles[0] || null;
  const [draft, setDraft] = useState(() => toDraft({}));
  const [savingPerms, setSavingPerms] = useState(false);
  const permKey = permRole ? `${permRole.id}:${JSON.stringify(permRole.permissions || {})}` : '';
  const [draftKey, setDraftKey] = useState('');
  if (draftKey !== permKey) {
    setDraftKey(permKey);
    setDraft(toDraft(permRole ? permRole.permissions : {}));
  }

  const [newRoleName, setNewRoleName] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [savingRename, setSavingRename] = useState(false);

  const handleCreateRole = async () => {
    if (!canCreate || creatingRole) return;
    const n = newRoleName.trim();
    if (!n) { toast.error('Role name is required', 'Enter the role name'); return; }
    if (roles.some((r) => r.name.toLowerCase() === n.toLowerCase())) { toast.error('Role already exists', `${n} already exists`); return; }
    setCreatingRole(true);
    try {
      const { data, message } = await api.post('/admin/roles', { name: n, permissions: {} });
      toast.success(message || 'Role created', 'Now choose what this role can access.');
      setNewRoleName('');
      await reloadRoles();
      if (data && data.id) setPermRoleId(data.id);
      setActiveTab('permissions');
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setCreatingRole(false);
    }
  };
  const handleRenameRole = async () => {
    if (!renaming) return;
    const n = renaming.name.trim();
    if (!n) { toast.error('Role name is required', 'Enter the role name'); return; }
    if (roles.some((r) => r.id !== renaming.id && r.name.toLowerCase() === n.toLowerCase())) { toast.error('Role already exists', `${n} already exists`); return; }
    setSavingRename(true);
    try {
      const old = roles.find((r) => r.id === renaming.id);
      const { message } = await api.put(`/admin/roles/${renaming.id}`, { name: n });
      toast.success(message || 'Role updated');
      setRenaming(null);
      reloadRoles(); reloadUsers();
      if (old && user && old.name === user.role) refreshUser().catch(() => {});
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSavingRename(false);
    }
  };
  const handleDeleteRole = async (r) => {
    if (!canDelete) return;
    if (r.name === SUPER) { toast.error('Not allowed', 'Super Admin cannot be deleted'); return; }
    if (r.user_count > 0) { toast.error('Role in use', `${r.user_count} user(s) have this role. Change their role first`); return; }
    if (!window.confirm(`Delete role "${r.name}"?`)) return;
    try {
      const { message } = await api.del(`/admin/roles/${r.id}`);
      toast.success(message || 'Role deleted');
      if (permRoleId === r.id) setPermRoleId(null);
      reloadRoles();
    } catch (err) {
      toast.error('Could not delete', err.message);
    }
  };

  const isSuper = !!permRole && permRole.name === SUPER;
  const readOnly = !canEdit;
  const locked = readOnly || isSuper || !permRole;

  const setCell = (d, key, action, value) => {
    const row = { ...d[key], [action]: value };
    const pg = ALL_PAGES.find((p) => p.key === key);
    if (action === 'view' && !value) COLS.forEach((c) => { row[c] = false; });
    if (action !== 'view' && value) row.view = true;
    if (pg) COLS.forEach((c) => { if (!applies(pg, c)) row[c] = false; });
    return { ...d, [key]: row };
  };
  const toggle = (key, action) => {
    if (locked) return;
    setDraft((d) => setCell(d, key, action, !(d[key] && d[key][action])));
  };
  const rowAll = (pg) => COLS.every((c) => !applies(pg, c) || (draft[pg.key] && draft[pg.key][c]));
  const toggleRow = (pg) => {
    if (locked) return;
    const val = !rowAll(pg);
    setDraft((d) => {
      const row = {};
      COLS.forEach((c) => { row[c] = applies(pg, c) ? val : false; });
      return { ...d, [pg.key]: row };
    });
  };
  const colPages = (c) => ALL_PAGES.filter((pg) => applies(pg, c));
  const colAll = (c) => colPages(c).every((pg) => draft[pg.key] && draft[pg.key][c]);
  const toggleCol = (c) => {
    if (locked) return;
    const val = !colAll(c);
    setDraft((d) => colPages(c).reduce((acc, pg) => setCell(acc, pg.key, c, val), d));
  };

  const handleSavePerms = async () => {
    if (locked) return;
    setSavingPerms(true);
    try {
      const { message } = await api.put(`/admin/roles/${permRole.id}`, { permissions: draft });
      toast.success(message || 'Permissions saved', `${permRole.name} role has been updated.`);
      await reloadRoles();
      if (user && permRole.name === user.role) refreshUser().catch(() => {});
    } catch (err) {
      toast.error('Could not save', err.message);
    } finally {
      setSavingPerms(false);
    }
  };

  const Box = ({ on, na, onClick, title }) => {
    if (na) return <span className="text-white/25 text-[15px]">–</span>;
    const checked = on || isSuper;
    return (
      <button onClick={onClick} disabled={locked} title={title}
        className={`w-[18px] h-[18px] rounded-[5px] inline-flex items-center justify-center transition-all ${checked ? 'bg-gradient-to-br from-purple-600 to-indigo-700 border border-purple-300' : 'bg-white/5 border border-white/30'} ${locked ? 'cursor-default' : 'cursor-pointer hover:border-purple-400'}`}
        aria-label={title || 'toggle'}>
        {checked && <span className="w-[5px] h-[9px] border-white border-r-2 border-b-2 rotate-45 -mt-[2px]" />}
      </button>
    );
  };

  const selfEditing = editingUser && isSelf(editingUser);

  return (
    <DashboardLayout>
      <div className="w-full h-full overflow-y-auto custom-scrollbar animate-fade-in p-1">
        <PageHeader title="Admin" />

        <div className="tab-scroll flex flex-nowrap items-center justify-start gap-1 sm:gap-1.5 md:gap-2 mb-3 sm:mb-4 p-1 bg-transparent rounded-full border border-white/40 overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1 sm:gap-1.5 md:gap-2 px-3 sm:px-4 md:px-5 py-1 sm:py-1 md:py-1.5 rounded-full text-[12px] sm:text-[13px] md:text-[14px] transition-all duration-300 ease-in-out whitespace-nowrap
                ${activeTab === tab.id ? 'bg-gradient-to-r from-purple-500 via-purple-700 to-indigo-700 text-white border border-white/40' : 'text-white hover:bg-white/20'}`}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <span className="text-white">{tab.icon}</span>
              <span className="tracking-wide inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'users' && (
          <>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2 animate-fade-in-up relative z-10">
              <SearchInput value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} placeholder="Search user" />
              {canCreate && (
                <button onClick={handleAddUser} className="flex items-center justify-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] transition-all duration-200 animate-zoom-in" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <FaPlus size={12} /> Add User
                </button>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden animate-fade-in-up">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[720px] sm:min-w-full">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      <th className={thCls}>Name</th>
                      <th className={thCls}>Username</th>
                      <th className={thCls}>Role</th>
                      <th className={thCls}>Status</th>
                      <th className={thCls}>Created</th>
                      <th className={`${thCls} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-white/40 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Loading…</td></tr>
                    ) : usersError ? (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-red-400 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{usersError}</td></tr>
                    ) : currentItems.length === 0 ? (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-white/40 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>No users found.</td></tr>
                    ) : currentItems.map((u, index) => (
                      <tr key={u.id} className={`border-b border-white/15 hover:bg-white/5 transition-colors duration-200 h-9 items-center animate-fade-in-up delay-${(index + 1) * 100}`} style={{ animationFillMode: 'both' }}>
                        <td className="px-2 py-1.5 text-white text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {u.full_name}{isSelf(u) && <span className="text-white/40"> (you)</span>}
                        </td>
                        <td className="px-2 py-1.5 text-purple-300 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>@{u.username}</td>
                        <td className="px-2 py-1.5"><StatusBadge label={u.role || '—'} color={roleColor[u.role] || 'purple'} /></td>
                        <td className="px-2 py-1.5"><StatusBadge label={u.status || 'Active'} color={(u.status || 'Active') === 'Active' ? 'green' : 'red'} /></td>
                        <td className="px-2 py-1.5 text-white/70 text-[12px] whitespace-nowrap" style={{ fontFamily: 'Poppins, sans-serif' }}>{fmtDate(u.created_at)}</td>
                        <td className="px-2 py-1.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <button onClick={() => handleEditUser(u)} title="Edit" className="w-7 h-7 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95">
                                <FaEdit size={12} />
                              </button>
                            )}
                            {canDelete && !isSelf(u) && (
                              <button onClick={() => handleDeleteUser(u)} title="Delete" className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[12px] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95">
                                <FaTrash size={12} />
                              </button>
                            )}
                            {!canEdit && (!canDelete || isSelf(u)) && <span className="text-white/30 text-[12px]">—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={currentPage} setCurrentPage={setCurrentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} />
            </div>
          </>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-3 animate-fade-in-up">
            {canCreate && (
              <div className="bg-white/5 border border-white/10 rounded-sm p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateRole(); }}
                  placeholder="Enter role name"
                  className="flex-1 bg-white/5 border border-white/40 rounded-sm px-3 py-2 text-white placeholder-white/40 text-[14px] focus:outline-none focus:border-purple-400"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
                <button onClick={handleCreateRole} disabled={creatingRole} className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[14px] disabled:opacity-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <FaPlus size={11} /> {creatingRole ? 'Creating…' : 'Create Role'}
                </button>
              </div>
            )}

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[520px] sm:min-w-full">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      <th className="px-3 py-2 text-white text-[12px] font-medium uppercase tracking-wider">Role</th>
                      <th className="px-3 py-2 text-white text-[12px] font-medium uppercase tracking-wider text-center">Users</th>
                      <th className="px-3 py-2 text-white text-[12px] font-medium uppercase tracking-wider text-center">Permissions</th>
                      <th className="px-3 py-2 text-white text-[12px] font-medium uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesLoading && roles.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-white/40 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Loading…</td></tr>
                    ) : rolesError ? (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-red-400 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{rolesError}</td></tr>
                    ) : roles.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-white/40 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>No roles found.</td></tr>
                    ) : roles.map((r) => (
                      <tr key={r.id} className="border-b border-white/15 hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center flex-none">
                              <FaUserShield className="text-white" size={12} />
                            </div>
                            <span className="text-white text-[14px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.name}{r.name === SUPER && <span className="text-white/40 text-[12px]"> · full access</span>}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-white/70 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>{r.user_count || 0}</td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => { setPermRoleId(r.id); setActiveTab('permissions'); }} className="px-3 py-1 rounded-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-[12px] inline-flex items-center gap-1.5" style={{ fontFamily: 'Poppins, sans-serif' }}>
                            <FaKey size={9} /> Manage
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && r.name !== SUPER && (
                              <button onClick={() => setRenaming({ id: r.id, name: r.name })} title="Rename" className="w-7 h-7 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 inline-flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                                <FaEdit size={11} />
                              </button>
                            )}
                            {canDelete && r.name !== SUPER && (
                              <button onClick={() => handleDeleteRole(r)} title="Delete" className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400 inline-flex items-center justify-center transition-all hover:scale-110 active:scale-95">
                                <FaTrash size={11} />
                              </button>
                            )}
                            {(r.name === SUPER || (!canEdit && !canDelete)) && <span className="text-white/30 text-[12px]">—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="flex flex-col lg:flex-row gap-3 animate-fade-in-up">
            <div className="lg:w-56 flex-none bg-white/5 border border-white/10 rounded-sm p-3">
              <h3 className="text-white/60 text-[12px] uppercase tracking-wider mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>Select Role</h3>
              {rolesLoading && roles.length === 0 && <div className="text-white/40 text-[13px]">Loading…</div>}
              {rolesError && <div className="text-red-400 text-[13px]">{rolesError}</div>}
              {roles.map((r) => (
                <div key={r.id} className={`px-3 py-2 rounded-md text-[14.5px] mb-1.5 cursor-pointer truncate ${permRole && permRole.id === r.id ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white' : 'bg-white/5 text-white/80 hover:bg-white/10'}`} onClick={() => setPermRoleId(r.id)} style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {r.name}{r.name === SUPER && <span className="opacity-60 text-[12px]"> · full</span>}
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-sm p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <div className="text-white text-[17px] font-semibold flex items-center gap-2" style={{ fontFamily: 'Poppins, sans-serif' }}><FaShieldAlt className="text-purple-300" size={13} /> {permRole ? permRole.name : '—'}</div>
                  <div className="text-white/50 text-[13px]">{isSuper ? 'Super Admin always has full access' : readOnly ? 'View only — you cannot edit roles' : 'Toggle permissions for each module, then Save'}</div>
                </div>
                {!locked && (
                  <div className="flex gap-2">
                    <button onClick={() => setDraft(toDraft(permRole.permissions))} className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-white/10 hover:bg-white/20 text-white text-[14px]" style={{ fontFamily: 'Poppins, sans-serif' }}><FaUndo size={11} /> Undo Changes</button>
                    <button onClick={handleSavePerms} disabled={savingPerms} className="flex items-center gap-1.5 px-4 py-2 rounded-sm bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white text-[14px] font-semibold disabled:opacity-50" style={{ fontFamily: 'Poppins, sans-serif' }}><FaSave size={11} /> {savingPerms ? 'Saving…' : 'Save Permissions'}</button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr style={{ fontFamily: 'Poppins, sans-serif' }}>
                      <th className="text-left px-2 py-2 text-white/60 text-[12px] uppercase tracking-wider border-b-2 border-white/15">Module / Page</th>
                      {COLS.map((c) => (
                        <th key={c} className="px-2 py-2 text-white/60 text-[12px] uppercase tracking-wider border-b-2 border-white/15 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span>{COL_LABEL[c]}</span>
                            {!locked && <Box on={colAll(c)} onClick={() => toggleCol(c)} title={`Select all ${COL_LABEL[c]}`} />}
                          </div>
                        </th>
                      ))}
                      {!locked && <th className="px-2 py-2 text-white/60 text-[12px] uppercase tracking-wider border-b-2 border-white/15 text-center">All</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_GROUPS.map((grp) => (
                      <React.Fragment key={grp.group || 'top'}>
                        {grp.group && (
                          <tr><td colSpan={locked ? 6 : 7} className="px-2 py-1.5 text-[13px] font-bold text-purple-200 tracking-wide bg-purple-500/15 border-y border-purple-400/25" style={{ fontFamily: 'Poppins, sans-serif' }}>{grp.group.toUpperCase()}</td></tr>
                        )}
                        {grp.pages.map((pg) => (
                          <tr key={pg.key} className="hover:bg-white/[0.03]">
                            <td className={`px-2 py-2 text-white text-[14px] ${grp.group ? 'pl-6' : 'font-semibold'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>{pg.label}</td>
                            {COLS.map((c) => (
                              <td key={c} className="px-2 py-2 text-center border-b border-white/8">
                                <Box on={draft[pg.key] && draft[pg.key][c]} na={!applies(pg, c)} onClick={() => toggle(pg.key, c)} title={`${pg.label} — ${COL_LABEL[c]}`} />
                              </td>
                            ))}
                            {!locked && (
                              <td className="px-2 py-2 text-center border-b border-white/8">
                                <Box on={rowAll(pg)} onClick={() => toggleRow(pg)} title={`Select all for ${pg.label}`} />
                              </td>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showUserModal && (
          <GlassModal
            title={editingUser ? 'Edit User' : 'Add New User'}
            icon={<FaUserShield className="text-white text-xs" />}
            onClose={closeUserModal}
            footer={
              <>
                <button onClick={closeUserModal} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Cancel</button>
                <button onClick={handleSaveUser} disabled={savingUser} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] shadow-green-500/25 transition-all disabled:opacity-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {savingUser ? 'Saving…' : `${editingUser ? 'Update' : 'Save'} User`}
                </button>
              </>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormInput label="Full Name" required placeholder="Enter full name" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} />
              <FormInput label="Username" required placeholder="Enter username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
              <FormInput label="Password" required={!editingUser} type="password" autoComplete="new-password" placeholder={editingUser ? 'Enter new password' : 'Enter password'} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              <div>
                <label className="block text-white/70 text-[13px] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>Role <span className="text-red-400">*</span></label>
                <SearchableSelect
                  value={userForm.role_id}
                  onChange={(v) => setUserForm({ ...userForm, role_id: v })}
                  options={roleOptions}
                  placeholder="Select role"
                  buttonClassName="w-full bg-white/5 border border-white/40 rounded-sm px-2.5 py-2 text-white text-[13px] focus:outline-none focus:border-purple-400"
                />
              </div>
              {selfEditing ? (
                <div>
                  <label className="text-white text-[13px] mb-0.5 block" style={{ fontFamily: 'Poppins, sans-serif' }}>Status</label>
                  <div className="px-2.5 py-2 text-white/60 text-[13px]" style={{ fontFamily: 'Poppins, sans-serif' }}>Active — you cannot deactivate your own account</div>
                </div>
              ) : (
                <FormSelect label="Status" options={['Active', 'Inactive']} value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value })} />
              )}
            </div>
          </GlassModal>
        )}

        {renaming && (
          <GlassModal
            title="Rename Role"
            icon={<FaUserShield className="text-white text-xs" />}
            maxWidth="max-w-md"
            onClose={() => setRenaming(null)}
            footer={
              <>
                <button onClick={() => setRenaming(null)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-sm text-white text-[13px] transition-all" style={{ fontFamily: 'Poppins, sans-serif' }}>Cancel</button>
                <button onClick={handleRenameRole} disabled={savingRename} className="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-sm text-white text-[13px] transition-all disabled:opacity-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {savingRename ? 'Saving…' : 'Update Role'}
                </button>
              </>
            }
          >
            <FormInput label="Role Name" required value={renaming.name} onChange={(e) => setRenaming({ ...renaming, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') handleRenameRole(); }} />
          </GlassModal>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Admin;
