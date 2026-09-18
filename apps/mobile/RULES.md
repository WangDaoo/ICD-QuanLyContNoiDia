# RULES — React Native / Expo

- Mobile tập trung Gate/Yard/tra cứu hiện trường.
- Component: PascalCase.
- Screen kết thúc bằng `Screen.tsx`.
- Hook dùng `useXxx`.
- Event handler `handleXxx`; callback prop `onXxx`.
- Mobile không giữ Partner API Key.
- Mobile không gọi external partner endpoint.
- Gate-in/Gate-out luôn phải gọi Backend để re-check.
- Offline cache chỉ để xem; action quan trọng không tự queue nếu chưa được đặc tả.
