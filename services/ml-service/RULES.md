# RULES — ML Service (FastAPI)

- ML chỉ xếp hạng candidate đã qua hard rules từ Backend.
- ML không được tự quyết định slot hợp lệ/không hợp lệ.
- API layer mỏng.
- Ranking logic ở service/model layer.
- Model artifact versioned.
- Nếu ML lỗi, Backend có fallback rule-based theo đặc tả.
- Python naming theo PEP 8: snake_case, class PascalCase.
