import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { masterDataApi } from '../api/master-data.api';
import { MasterDataModal } from '../components/MasterDataModal';
import {
  getMasterDataDefinition,
  MASTER_DATA_TYPES,
} from '../master-data.config';
import type {
  MasterDataMutationInput,
  MasterDataRecord,
  MasterDataType,
} from '../master-data.types';
import './MasterData.css';

export const MasterDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MasterDataType>('SHIPPING_LINE');
  const [records, setRecords] = useState<Record<MasterDataType, MasterDataRecord[]>>({
    SHIPPING_LINE: [],
    CONSIGNEE: [],
    CLEARING_AGENT: [],
    TRANSPORTER: [],
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<MasterDataRecord | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchSnapshot = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await masterDataApi.getSnapshot();
      const newRecords: Record<MasterDataType, MasterDataRecord[]> = {
        SHIPPING_LINE: [],
        CONSIGNEE: [],
        CLEARING_AGENT: [],
        TRANSPORTER: [],
      };

      for (const catalog of snapshot.catalogs) {
        newRecords[catalog.type] = catalog.items;
      }

      setRecords(newRecords);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh mục Master Data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const activeDefinition = useMemo(() => {
    return getMasterDataDefinition(activeTab);
  }, [activeTab]);

  const currentTabRecords = records[activeTab] || [];

  const filteredRecords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return currentTabRecords.filter((item) => {
      if (statusFilter === 'ACTIVE' && !item.active) return false;
      if (statusFilter === 'INACTIVE' && item.active) return false;

      if (!query) return true;

      const matchCode = item.code?.toLowerCase().includes(query);
      const matchName = item.name?.toLowerCase().includes(query);
      const matchTax = item.taxCode?.toLowerCase().includes(query);
      const matchPhone = item.phone?.toLowerCase().includes(query);
      const matchLicense = item.licenseNumber?.toLowerCase().includes(query);
      const matchEmail = item.email?.toLowerCase().includes(query);

      return (
        matchCode ||
        matchName ||
        matchTax ||
        matchPhone ||
        matchLicense ||
        matchEmail
      );
    });
  }, [currentTabRecords, searchQuery, statusFilter]);

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (record: MasterDataRecord) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!saving) {
      setModalOpen(false);
      setEditingRecord(null);
    }
  };

  const handleSubmitModal = async (input: MasterDataMutationInput) => {
    setSaving(true);
    setError(null);
    try {
      if (editingRecord) {
        const updated = await masterDataApi.update(activeTab, editingRecord.id, input);
        setRecords((prev) => ({
          ...prev,
          [activeTab]: prev[activeTab].map((r) =>
            r.id === editingRecord.id ? updated : r,
          ),
        }));
        setSuccessMessage(`Đã cập nhật bản ghi "${updated.name}" thành công.`);
      } else {
        const created = await masterDataApi.create(activeTab, input);
        setRecords((prev) => ({
          ...prev,
          [activeTab]: [created, ...prev[activeTab]],
        }));
        setSuccessMessage(`Đã thêm mới "${created.name}" thành công.`);
      }
      setModalOpen(false);
      setEditingRecord(null);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (record: MasterDataRecord) => {
    const nextActive = !record.active;
    const actionLabel = nextActive ? 'kích hoạt' : 'tạm ngưng';
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn ${actionLabel} "${record.name}" (${record.code}) không?`,
    );
    if (!confirmed) return;

    try {
      setError(null);
      const updated = await masterDataApi.setActive(activeTab, record.id, nextActive);
      setRecords((prev) => ({
        ...prev,
        [activeTab]: prev[activeTab].map((r) =>
          r.id === record.id ? updated : r,
        ),
      }));
      setSuccessMessage(
        `Đã ${actionLabel} "${record.name}" thành công.`,
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err?.message || `Không thể ${actionLabel} bản ghi.`);
    }
  };

  return (
    <div className="master-data-page">
      <div className="master-data-toolbar">
        <div>
          <span className="master-data-toolbar-badge">Administration</span>
          <h2 className="master-data-title">Master Data Management</h2>
          <p className="master-data-subtitle">
            Quản lý các danh mục dữ liệu dùng chung cho hệ thống ICD (Shipping Lines, Consignees, Clearing Agents, Transporters).
          </p>
        </div>
        <div className="master-data-toolbar-actions">
          <button
            type="button"
            className="master-data-btn master-data-btn-secondary"
            onClick={fetchSnapshot}
            disabled={loading}
          >
            Làm mới
          </button>
          <button
            type="button"
            className="master-data-btn master-data-btn-primary"
            onClick={handleOpenCreate}
          >
            + Thêm {activeDefinition.shortLabel}
          </button>
        </div>
      </div>

      {error && (
        <div className="master-data-alert master-data-alert-danger">
          <span>{error}</span>
          <button
            type="button"
            className="master-data-action-btn"
            onClick={() => setError(null)}
          >
            Đóng
          </button>
        </div>
      )}

      {successMessage && (
        <div className="master-data-alert master-data-alert-success">
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="master-data-tabs" role="tablist">
        {MASTER_DATA_TYPES.map((cat) => {
          const isActive = activeTab === cat.type;
          const count = records[cat.type]?.length || 0;
          return (
            <button
              key={cat.type}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`master-data-tab ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(cat.type);
                setSearchQuery('');
              }}
            >
              <span>{cat.label}</span>
              <span className="master-data-tab-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="master-data-filter-bar">
        <div className="master-data-search-box">
          <span className="master-data-search-icon">🔍</span>
          <input
            type="text"
            className="master-data-search-input"
            placeholder={`Tìm theo mã, tên, MST... (${activeDefinition.shortLabel})`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="master-data-status-filter">
          <select
            className="master-data-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
            <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="master-data-card">
        {loading ? (
          <div className="master-data-loading">
            <div className="master-data-spinner" />
            <span>Đang tải danh mục dữ liệu...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="master-data-empty">
            <p>
              {searchQuery || statusFilter !== 'ALL'
                ? 'Không tìm thấy bản ghi phù hợp với bộ lọc.'
                : `Chưa có dữ liệu cho ${activeDefinition.label}. Nhấn nút "+ Thêm ${activeDefinition.shortLabel}" để tạo mới.`}
            </p>
          </div>
        ) : (
          <div className="master-data-table-container">
            <table className="master-data-table">
              <thead>
                <tr>
                  <th>Mã định danh</th>
                  <th>Tên đơn vị</th>
                  {activeTab === 'CONSIGNEE' && <th>Mã số thuế</th>}
                  {activeTab === 'CONSIGNEE' && <th>Liên hệ</th>}
                  {activeTab === 'CONSIGNEE' && <th>Địa chỉ</th>}
                  {activeTab === 'CLEARING_AGENT' && <th>Số giấy phép</th>}
                  {activeTab === 'TRANSPORTER' && <th>Mã số thuế</th>}
                  {activeTab === 'TRANSPORTER' && <th>Số điện thoại</th>}
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="master-data-code-badge">{item.code}</span>
                    </td>
                    <td>
                      <strong>{item.name}</strong>
                    </td>

                    {activeTab === 'CONSIGNEE' && (
                      <td>{item.taxCode || '—'}</td>
                    )}
                    {activeTab === 'CONSIGNEE' && (
                      <td>
                        {item.phone && <div>📞 {item.phone}</div>}
                        {item.email && <div>✉️ {item.email}</div>}
                        {!item.phone && !item.email && '—'}
                      </td>
                    )}
                    {activeTab === 'CONSIGNEE' && (
                      <td>{item.address || '—'}</td>
                    )}

                    {activeTab === 'CLEARING_AGENT' && (
                      <td>{item.licenseNumber || '—'}</td>
                    )}

                    {activeTab === 'TRANSPORTER' && (
                      <td>{item.taxCode || '—'}</td>
                    )}
                    {activeTab === 'TRANSPORTER' && (
                      <td>{item.phone || '—'}</td>
                    )}

                    <td>
                      <span
                        className={`master-data-status-badge ${
                          item.active ? 'active' : 'inactive'
                        }`}
                      >
                        {item.active ? '● Hoạt động' : '○ Tạm ngưng'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="master-data-row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="master-data-action-btn"
                          onClick={() => handleOpenEdit(item)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className={`master-data-action-btn ${
                            item.active ? 'toggle-active' : 'toggle-inactive'
                          }`}
                          onClick={() => handleToggleActive(item)}
                        >
                          {item.active ? 'Ngưng' : 'Kích hoạt'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <MasterDataModal
        open={modalOpen}
        type={activeTab}
        editingRecord={editingRecord}
        saving={saving}
        onClose={handleCloseModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
};

export default MasterDataPage;
