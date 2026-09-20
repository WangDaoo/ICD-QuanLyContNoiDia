import React, { useEffect, useState } from 'react';
import {
  getMasterDataDefinition,
  type MasterDataFieldKey,
} from '../master-data.config';
import type {
  MasterDataMutationInput,
  MasterDataRecord,
  MasterDataType,
} from '../master-data.types';

interface MasterDataModalProps {
  open: boolean;
  type: MasterDataType;
  editingRecord: MasterDataRecord | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: MasterDataMutationInput) => Promise<void>;
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({
  open,
  type,
  editingRecord,
  saving,
  onClose,
  onSubmit,
}) => {
  const definition = getMasterDataDefinition(type);

  const [formData, setFormData] = useState<Record<MasterDataFieldKey, string>>({
    code: '',
    name: '',
    taxCode: '',
    phone: '',
    email: '',
    address: '',
    licenseNumber: '',
  });

  const [active, setActive] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (editingRecord) {
      setFormData({
        code: editingRecord.code || '',
        name: editingRecord.name || '',
        taxCode: editingRecord.taxCode || '',
        phone: editingRecord.phone || '',
        email: editingRecord.email || '',
        address: editingRecord.address || '',
        licenseNumber: editingRecord.licenseNumber || '',
      });
      setActive(editingRecord.active);
    } else {
      setFormData({
        code: '',
        name: '',
        taxCode: '',
        phone: '',
        email: '',
        address: '',
        licenseNumber: '',
      });
      setActive(true);
    }
    setErrorMessage(null);
  }, [editingRecord, open, type]);

  if (!open) return null;

  const handleChange = (key: MasterDataFieldKey, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate required fields
    for (const field of definition.fields) {
      if (field.required && !formData[field.key]?.trim()) {
        setErrorMessage(`Vui lòng nhập ${field.label}.`);
        return;
      }
    }

    if (formData.email?.trim() && !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setErrorMessage('Định dạng email không hợp lệ.');
      return;
    }

    try {
      await onSubmit({
        code: formData.code.trim(),
        name: formData.name.trim(),
        active,
        taxCode: formData.taxCode?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        licenseNumber: formData.licenseNumber?.trim() || undefined,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
    }
  };

  const isEditing = !!editingRecord;

  return (
    <div className="md-modal-overlay" onClick={onClose}>
      <div
        className="md-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="md-modal-title"
      >
        <div className="md-modal-header">
          <div>
            <h3 id="md-modal-title" className="md-modal-title">
              {isEditing ? `Cập nhật ${definition.shortLabel}` : `Thêm mới ${definition.shortLabel}`}
            </h3>
            <p className="md-modal-subtitle">{definition.description}</p>
          </div>
          <button
            type="button"
            className="md-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        {errorMessage && (
          <div className="md-modal-alert md-modal-alert-danger">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="md-modal-form">
          {definition.fields.map((field) => {
            const isCodeField = field.key === 'code';
            const value = formData[field.key] ?? '';

            return (
              <div key={field.key} className="md-form-group">
                <label className="md-form-label">
                  {field.label}
                  {field.required && <span className="md-required-mark"> *</span>}
                </label>

                {field.type === 'textarea' ? (
                  <textarea
                    className="md-form-textarea"
                    rows={3}
                    value={value}
                    placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}`}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={saving}
                  />
                ) : (
                  <input
                    type={field.type === 'email' ? 'email' : 'text'}
                    className="md-form-input"
                    value={value}
                    placeholder={field.placeholder || `Nhập ${field.label.toLowerCase()}`}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    disabled={saving || (isEditing && isCodeField)}
                  />
                )}
                {isEditing && isCodeField && (
                  <span className="md-form-hint">Mã định danh không thể thay đổi sau khi tạo.</span>
                )}
              </div>
            );
          })}

          <div className="md-form-group md-form-toggle-group">
            <label className="md-toggle-label">
              <input
                type="checkbox"
                className="md-toggle-checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={saving}
              />
              <span className="md-toggle-text">
                {active ? 'Đang hoạt động (ACTIVE)' : 'Tạm ngưng (INACTIVE)'}
              </span>
            </label>
          </div>

          <div className="md-modal-actions">
            <button
              type="button"
              className="md-btn md-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="md-btn md-btn-primary"
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
