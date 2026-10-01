import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useToast } from '../../context/ToastContext'

const EMPTY_FORM = { teamName: '', password: '' }

export default function AdminUsers() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null) // null = create mode
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [lastCreated, setLastCreated] = useState(null) // { username, teamName, password }
  const [deletingUser, setDeletingUser] = useState(null) // user object to delete
  const [deleting, setDeleting] = useState(false)

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users')
      setUsers(data.users)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [])

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setFormError(''); setLastCreated(null); setShowModal(true) }
  const openEdit = (u) => {
    setEditUser(u)
    setForm({ teamName: u.teamName || u.name || u.username || '', password: '' })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setFormError('')
    const cleanTeam = form.teamName.trim()
    if (!cleanTeam) { setFormError('Team Name is required.'); return }
    if (!editUser && !form.password) { setFormError('Password is required for new accounts.'); return }
    if (form.password && form.password.length < 6) { setFormError('Password must contain at least 6 characters.'); return }
    setSaving(true)
    try {
      if (editUser) {
        const payload = { teamName: cleanTeam, name: cleanTeam }
        if (form.password) payload.password = form.password
        await api.patch(`/admin/users/${editUser._id}`, payload)
        toast.success('Participant updated')
        setShowModal(false)
        fetchUsers()
      } else {
        // username on backend is derived from teamName — send teamName only
        const payload = { teamName: cleanTeam, password: form.password }
        const { data } = await api.post('/admin/users', payload)
        // Store plaintext password only from current form state (never from server)
        setLastCreated({
          teamName: data.user.teamName,
          username: data.user.username,
          password: form.password,
        })
        toast.success('Participant created successfully')
        setShowModal(false)
        fetchUsers()
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save'
      setFormError(msg)
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (u) => {
    try {
      await api.patch(`/admin/users/${u._id}`, { isActive: !u.isActive })
      toast.success(`Account ${u.isActive ? 'deactivated' : 'activated'}`)
      fetchUsers()
    } catch { toast.error('Failed to update') }
  }

  const handleDeleteUser = (u) => {
    setDeletingUser(u)
  }

  const confirmDeleteUser = async () => {
    if (!deletingUser) return
    setDeleting(true)
    try {
      await api.delete(`/admin/users/${deletingUser._id}`)
      toast.success('Participant deleted successfully')
      setDeletingUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete participant')
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setBulkUploading(true)
    try {
      const { data } = await api.post('/admin/users/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`Created ${data.created} participants`)
      if (data.errors.length > 0) toast.error(`${data.errors.length} rows had errors`)
      fetchUsers()
    } catch { toast.error('Bulk upload failed') }
    finally { setBulkUploading(false); e.target.value = '' }
  }

  const filtered = users.filter(u =>
    (u.teamName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  )

  const getRoundBadge = (status) => {
    if (!status) return <span className="badge badge-gray">—</span>
    if (status.status === 'submitted' || status.status === 'pending-review')
      return <span className="badge badge-green" style={{ fontSize:'0.68rem' }}>{status.totalScore}pts</span>
    return <span className="badge badge-amber" style={{ fontSize:'0.68rem' }}>In Progress</span>
  }

  return (
    <div style={{ animation:'fadeIn 300ms ease' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'1.5rem', letterSpacing:'0.08em', color:'var(--text-primary)', marginBottom:'4px' }}>
            PARTICIPANTS
          </h1>
          <p style={{ color:'var(--text-dim)', fontSize:'0.82rem' }}>{users.length} total accounts</p>
        </div>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor:'pointer' }}>
            {bulkUploading ? 'Uploading...' : 'Bulk CSV Upload'}
            <input type="file" accept=".csv" onChange={handleBulkUpload} style={{ display:'none' }} id="bulk-upload" />
          </label>
          <button id="create-participant-btn" className="btn btn-primary btn-sm" onClick={openCreate}>
            + Create Participant
          </button>
        </div>
      </div>

      {/* CSV format note */}
      <div style={{ marginBottom:'16px', padding:'10px 14px', background:'rgba(255,140,0,0.08)', border:'1px solid rgba(255,140,0,0.2)', borderRadius:'var(--radius-md)', fontSize:'0.78rem', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
        CSV format: <strong>teamName, password</strong> (header row required)
      </div>

      {/* Search */}
      <div style={{ marginBottom:'16px' }}>
        <input
          className="input"
          placeholder="Search by team name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth:'340px' }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'40px 0' }}>
          <div className="spinner" style={{ width:'24px', height:'24px' }} />
          <span style={{ color:'var(--text-dim)', fontFamily:'var(--font-heading)', letterSpacing:'0.1em', fontSize:'0.8rem' }}>Loading...</span>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Team Name</th>
                <th>R1</th>
                <th>R2</th>
                <th>R3</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text-dim)', padding:'32px' }}>No participants found</td></tr>
              ) : filtered.map(u => (
                <tr key={u._id}>
                  <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{u.teamName || u.name || u.username}</td>
                  <td>{getRoundBadge(u.rounds?.[1])}</td>
                  <td>{getRoundBadge(u.rounds?.[2])}</td>
                  <td>{getRoundBadge(u.rounds?.[3])}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      <button
                        className={`btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => handleToggleActive(u)}
                        style={{ fontSize:'0.72rem' }}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteUser(u)}
                        style={{ fontSize:'0.72rem' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Created Participant Info Card */}
      {lastCreated && (
        <div style={{ marginBottom:'20px', padding:'16px 20px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.35)', borderRadius:'var(--radius-md)', position:'relative' }}>
          <button onClick={() => setLastCreated(null)} style={{ position:'absolute', top:'10px', right:'12px', background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'1rem' }}>✕</button>
          <p style={{ fontFamily:'var(--font-heading)', fontSize:'0.78rem', letterSpacing:'0.15em', color:'#34d399', marginBottom:'10px' }}>✓ PARTICIPANT CREATED</p>
          <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:'6px 12px', fontSize:'0.82rem', fontFamily:'var(--font-mono)' }}>
            <span style={{ color:'var(--text-dim)' }}>Team:</span>
            <span style={{ color:'var(--text-primary)', fontWeight:600 }}>{lastCreated.teamName}</span>
            <span style={{ color:'var(--text-dim)' }}>Login Username:</span>
            <span style={{ color:'#34d399', fontWeight:600 }}>{lastCreated.username}</span>
            <span style={{ color:'var(--text-dim)' }}>Password:</span>
            <span style={{ color:'var(--text-primary)' }}>{lastCreated.password}</span>
          </div>
          <p style={{ marginTop:'10px', fontSize:'0.72rem', color:'var(--text-dim)' }}>Save these credentials now. Password is shown once and not stored by server.</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editUser ? 'Edit Participant' : '+ New Participant'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div className="form-group">
                <label className="form-label">Team Name *</label>
                <input
                  id="new-user-teamname"
                  className="input"
                  value={form.teamName}
                  onChange={e => { setForm(f => ({ ...f, teamName: e.target.value })); setFormError('') }}
                  placeholder="e.g. Team Phoenix"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input
                  id="new-user-password"
                  className="input"
                  type="password"
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setFormError('') }}
                  placeholder="Min 6 characters"
                />
              </div>
              {formError && (
                <div style={{ padding:'8px 12px', background:'rgba(185,28,28,0.18)', border:'1px solid rgba(239,68,68,0.45)', borderRadius:'var(--radius-sm)', color:'#f87171', fontSize:'0.8rem' }}>
                  {formError}
                </div>
              )}
              <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button id="save-participant-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editUser ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: '#f87171' }}>Delete Participant</h2>
              <button onClick={() => setDeletingUser(null)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <p style={{ color:'var(--text-primary)', fontSize:'0.9rem', lineHeight:'1.5' }}>
                Are you sure you want to permanently delete participant <strong>"{deletingUser.teamName || deletingUser.name || deletingUser.username}"</strong>?
              </p>
              <p style={{ color:'var(--amber-warn, #f59e0b)', fontSize:'0.8rem', fontFamily:'var(--font-mono)' }}>
                This will delete the user account and all their submission records. This action cannot be undone.
              </p>
              <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'8px' }}>
                <button className="btn btn-secondary" onClick={() => setDeletingUser(null)} disabled={deleting}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDeleteUser} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Participant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
