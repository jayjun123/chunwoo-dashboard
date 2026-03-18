import { useState } from 'react';
import { initialFormState } from '../utils/siteConstants';

/**
 * 현장 추가/수정 폼 상태 (form, isEditing).
 * 데이터·디자인 변경 없이 상태만 분리.
 */
export function useSiteForm() {
  const [form, setForm] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  return { form, setForm, isEditing, setIsEditing };
}
