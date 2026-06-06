# Docs Placement Agent

Mỗi khi được yêu cầu tạo một file hoặc thư mục tài liệu mới, hãy chạy qua checklist này **trước khi tạo bất kỳ file nào**.

---

## Bước 1 — Xác định loại tài liệu

Trả lời 3 câu hỏi sau:

1. **Ai đọc?** → engineer / designer+frontend / toàn team / ops
2. **Khi nào đọc?** → lúc build / lúc design / lúc onboard / lúc deploy hoặc incident
3. **Trả lời câu hỏi gì?** → hệ thống hoạt động ra sao / UI dùng như thế nào / làm việc với code ra sao / vận hành ra sao

---

## Bước 2 — Tra bảng phân loại

| Nội dung tài liệu | Thư mục đặt | Lý do |
|---|---|---|
| Sơ đồ tổng quan hệ thống, context diagram, tech stack | `docs/architecture/overview.md` | Ai cũng cần đọc khi onboard |
| Luồng dữ liệu request→response, async job, event bus | `docs/architecture/data-flow.md` | Engineer debug cần |
| Auth flow, JWT, OAuth, session | `docs/architecture/auth.md` | Security-sensitive, tách riêng |
| Cloud resources, networking, environments | `docs/architecture/infrastructure.md` | DevOps/SRE cần |
| Quyết định kỹ thuật (tại sao chọn X thay Y) | `docs/architecture/decisions/NNNN-slug.md` | ADR — không xóa, chỉ supersede |
| Design token: màu sắc, spacing, typography, shadow | `docs/design-system/foundations/` | Primitive — không depend component nào |
| Hướng dẫn dùng một UI component cụ thể | `docs/design-system/components/<name>.md` | Một file per component |
| Kết hợp nhiều component giải quyết vấn đề UI | `docs/design-system/patterns/<name>.md` | Pattern ≠ component đơn lẻ |
| Git flow, PR process, code review checklist | `docs/guides/contributing.md` | Quy trình team |
| Setup local, env vars, chạy lần đầu | `docs/guides/onboarding.md` | Người mới |
| Chiến lược test, coverage, test pyramid | `docs/guides/testing.md` | Mọi engineer |
| Quy trình release, versioning, changelog | `docs/guides/release.md` | Release manager |
| Các bước deploy step-by-step | `docs/runbooks/deployment.md` | Ops — checklist format |
| Cách rollback khi có lỗi | `docs/runbooks/rollback.md` | Ops — dùng khi khẩn cấp |
| Severity levels, escalation, post-mortem | `docs/runbooks/incident-response.md` | SRE/on-call |

---

## Bước 3 — Kiểm tra các trường hợp dễ nhầm

Trước khi tạo file, hỏi:

**"Đây là mô tả hệ thống hay hướng dẫn làm việc với hệ thống?"**
- Mô tả hệ thống (cái gì, tại sao) → `architecture/`
- Hướng dẫn thao tác (làm như thế nào) → `guides/` hoặc `runbooks/`

**"Đây là quyết định thiết kế hay mô tả hiện trạng?"**
- Quyết định có lý do + lựa chọn đã bỏ qua → `architecture/decisions/` (ADR)
- Mô tả cách hoạt động hiện tại → `architecture/<topic>.md`

**"Đây là component hay pattern?"**
- Một component độc lập, có props → `design-system/components/`
- Kết hợp 2+ component giải quyết vấn đề UI cụ thể → `design-system/patterns/`

**"Đây là foundation hay component?"**
- Không import bất kỳ component nào (chỉ là giá trị/token) → `design-system/foundations/`
- Dùng token để xây dựng UI → `design-system/components/`

**"Đây là guide hay runbook?"**
- Đọc trước để hiểu quy trình → `guides/`
- Checklist thực thi khi deploy/incident → `runbooks/`

---

## Bước 4 — Nếu không khớp bảng nào

Nếu tài liệu mới không khớp bất kỳ mục nào ở trên, **đừng tự ý tạo thư mục mới**. Thay vào đó:

1. Mô tả nội dung file cho user
2. Đề xuất 2–3 vị trí có thể phù hợp kèm lý do
3. Hỏi user xác nhận trước khi tạo

---

## Bước 5 — Kiểm tra trùng lặp

Trước khi tạo, kiểm tra xem đã tồn tại file tương tự chưa:

```
docs/
  architecture/     ← hệ thống: cái gì, tại sao
    decisions/      ← ADR: quyết định + lý do
  design-system/    ← UI/UX: foundations → components → patterns
    foundations/
    components/
    patterns/
  guides/           ← quy trình team: làm như thế nào
  runbooks/         ← ops: thực thi khi deploy/incident
```

Nếu đã có file cùng topic → đề xuất cập nhật file cũ thay vì tạo file mới.

---

## Quy tắc đặt tên file

- Dùng `kebab-case`: `form-validation.md`, `data-flow.md`
- ADR: `NNNN-short-slug.md` với số thứ tự 4 chữ số: `0001-use-monorepo.md`
- Không dùng ngày tháng trong tên file (dùng frontmatter thay thế)
- Không dùng tên chung chung: `notes.md`, `misc.md`, `temp.md`

---

## Frontmatter (Không bắt buộc)

```yaml
---
title: <Tên rõ ràng>
category: architecture | design-system | guides | runbooks
status: draft | review | stable | deprecated
last_updated: YYYY-MM-DD
owner: @username
---
```

`status: deprecated` khi file không còn chính xác — không xóa, thêm banner ở đầu file:

```md
> ⚠️ **Deprecated** — Xem [file-mới.md](./file-mới.md) thay thế. File này giữ lại cho lịch sử.
```
