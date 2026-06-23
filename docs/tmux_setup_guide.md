# Tmux Setup Guide

Tài liệu này dùng để lưu lại cách cài đặt, cấu hình và sử dụng `tmux` trên VPS/Linux server.

---

## 1. Tmux là gì?

`tmux` là terminal multiplexer, giúp bạn:

- Mở nhiều terminal trong cùng một SSH session.
- Chia màn hình thành nhiều pane.
- Chạy process lâu dài mà không bị tắt khi mất kết nối SSH.
- Detach khỏi session rồi attach lại sau.

Ví dụ khi deploy server, bạn có thể chạy backend, frontend, logs trong nhiều pane khác nhau.

---

## 2. Cài đặt tmux

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install tmux -y
```

Kiểm tra version:

```bash
tmux -V
```

---

## 3. Tạo file cấu hình tmux

Mở file cấu hình:

```bash
nano ~/.tmux.conf
```

Paste nội dung cấu hình bên dưới vào file.

---

## 4. Cấu hình `.tmux.conf` khuyến nghị

```tmux
# =========================
# Basic settings
# =========================

# Bật chuột: click pane, resize pane, scroll bằng chuột
set -g mouse on

# Hỗ trợ màu đẹp hơn
set -g default-terminal "screen-256color"
set -ga terminal-overrides ",xterm-256color:Tc"

# Tăng số dòng scrollback history
set -g history-limit 100000

# Bắt đầu số window/pane từ 1 thay vì 0
set -g base-index 1
setw -g pane-base-index 1

# Tự đánh lại số window sau khi đóng window
set -g renumber-windows on

# Giảm delay khi dùng phím tắt
set -s escape-time 0

# =========================
# Split pane dễ hơn
# =========================

# Split ngang bằng phím |
bind | split-window -h -c "#{pane_current_path}"

# Split dọc bằng phím -
bind - split-window -v -c "#{pane_current_path}"

# =========================
# Reload config
# =========================

# Prefix + r để reload config
bind r source-file ~/.tmux.conf \; display-message "Tmux config reloaded!"

# =========================
# Di chuyển giữa các pane
# =========================

# Dùng Alt + arrow để chuyển pane, không cần bấm prefix
bind -n M-Left select-pane -L
bind -n M-Right select-pane -R
bind -n M-Up select-pane -U
bind -n M-Down select-pane -D

# Dùng Vim keys để chuyển pane: Prefix + h/j/k/l
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# =========================
# Resize pane
# =========================

# Prefix + H/J/K/L để resize pane
bind H resize-pane -L 5
bind J resize-pane -D 5
bind K resize-pane -U 5
bind L resize-pane -R 5

# =========================
# Copy mode
# =========================

# Dùng kiểu phím Vim trong copy mode
setw -g mode-keys vi

# Prefix + [ để vào copy mode
# Trong copy mode:
# - Dùng arrow hoặc h/j/k/l để di chuyển
# - Space để bắt đầu chọn
# - Enter để copy

bind-key -T copy-mode-vi v send -X begin-selection
bind-key -T copy-mode-vi y send -X copy-selection-and-cancel

# =========================
# Status bar
# =========================

# Bật status bar
set -g status on

# Refresh status bar mỗi 5 giây
set -g status-interval 5

# Vị trí status bar ở dưới
set -g status-position bottom

# Nội dung bên trái
set -g status-left "#[bold] #S "
set -g status-left-length 30

# Nội dung bên phải
set -g status-right " %Y-%m-%d %H:%M "
set -g status-right-length 60

# Hiển thị window đang active rõ hơn
setw -g window-status-current-format "#[bold] #I:#W "
setw -g window-status-format " #I:#W "
```

---

## 5. Apply cấu hình

Nếu chưa mở tmux, chỉ cần mở tmux mới:

```bash
tmux
```

Nếu đang ở trong tmux, reload config bằng:

```bash
tmux source-file ~/.tmux.conf
```

Hoặc dùng phím tắt đã cấu hình:

```text
Prefix + r
```

Mặc định `Prefix` của tmux là:

```text
Ctrl + b
```

Tức là bấm:

```text
Ctrl + b, sau đó bấm r
```

---

## 6. Các lệnh tmux hay dùng

### Tạo session mới

```bash
tmux new -s dev
```

### Detach khỏi session

```text
Ctrl + b, sau đó bấm d
```

Sau khi detach, chương trình trong tmux vẫn tiếp tục chạy.

### Xem danh sách session

```bash
tmux ls
```

### Vào lại session

```bash
tmux attach -t dev
```

Hoặc viết ngắn hơn:

```bash
tmux a -t dev
```

### Kill session

```bash
tmux kill-session -t dev
```

### Kill toàn bộ tmux server

```bash
tmux kill-server
```

---

## 7. Phím tắt quan trọng

| Hành động | Phím |
|---|---|
| Prefix mặc định | `Ctrl + b` |
| Detach khỏi session | `Ctrl + b`, rồi `d` |
| Tạo window mới | `Ctrl + b`, rồi `c` |
| Chuyển window kế tiếp | `Ctrl + b`, rồi `n` |
| Chuyển window trước | `Ctrl + b`, rồi `p` |
| Đổi tên window | `Ctrl + b`, rồi `,` |
| Đóng pane/window | `exit` hoặc `Ctrl + d` |
| Split ngang | `Ctrl + b`, rồi `|` |
| Split dọc | `Ctrl + b`, rồi `-` |
| Chuyển pane | `Alt + arrow` |
| Chuyển pane kiểu Vim | `Ctrl + b`, rồi `h/j/k/l` |
| Resize pane | `Ctrl + b`, rồi `H/J/K/L` |
| Vào copy/scroll mode | `Ctrl + b`, rồi `[` |
| Thoát copy mode | `q` |
| Reload config | `Ctrl + b`, rồi `r` |

---

## 8. Cách scroll trong tmux

Nếu đã bật:

```tmux
set -g mouse on
```

Bạn có thể scroll bằng chuột.

Nếu không dùng chuột:

```text
Ctrl + b, rồi [
```

Sau đó dùng phím mũi tên, PageUp/PageDown hoặc Vim keys để xem log cũ.

Thoát scroll mode:

```text
q
```

---

## 9. Dùng tmux khi deploy app

Ví dụ tạo session cho project:

```bash
tmux new -s anngon
```

Trong session đó có thể chia pane:

```text
Ctrl + b, rồi |
Ctrl + b, rồi -
```

Gợi ý bố cục:

```text
Pane 1: docker compose logs -f
Pane 2: htop
Pane 3: git pull / deploy command
Pane 4: backend shell
```

Detach ra ngoài:

```text
Ctrl + b, rồi d
```

Lần sau SSH lại server:

```bash
tmux a -t anngon
```

---

## 10. Những phần còn thiếu trong hướng dẫn ảnh gốc

Ảnh gốc đã có các phần tốt như:

- Bật chuột.
- Hỗ trợ màu 256 color.
- Tăng history scroll.
- Split pane bằng `|` và `-`.
- Reload config bằng `Prefix + r`.
- Chuyển pane bằng `Alt + arrow`.
- Đặt window/pane index bắt đầu từ 1.

Các phần nên bổ sung thêm:

- Lệnh cài tmux.
- Cách tạo, detach, attach và kill session.
- Giải thích `Prefix` là gì.
- Cách reload config sau khi sửa `.tmux.conf`.
- Cấu hình `renumber-windows on` để số window không bị nhảy.
- Cấu hình `escape-time 0` để phím tắt phản hồi nhanh hơn.
- Copy mode dùng Vim keys.
- Resize pane bằng phím tắt.
- Split pane giữ nguyên thư mục hiện tại bằng `-c "#{pane_current_path}"`.
- Status bar hoàn chỉnh, vì ảnh bị cắt ở phần `# status bar đẹp hơn`.

---

## 11. Troubleshooting

### Lỗi màu không đẹp hoặc màu sai

Thử kiểm tra terminal:

```bash
echo $TERM
```

Trong tmux thường nên thấy:

```text
screen-256color
```

Nếu vẫn lỗi màu, đảm bảo có dòng:

```tmux
set -g default-terminal "screen-256color"
set -ga terminal-overrides ",xterm-256color:Tc"
```

### Không scroll được bằng chuột

Kiểm tra config có dòng:

```tmux
set -g mouse on
```

Sau đó reload:

```bash
tmux source-file ~/.tmux.conf
```

### Không bấm được Alt + Arrow

Một số terminal hoặc browser-based terminal có thể bắt phím `Alt + Arrow` trước tmux. Khi đó dùng cách mặc định:

```text
Ctrl + b, rồi arrow
```

hoặc:

```text
Ctrl + b, rồi h/j/k/l
```

### Không thấy thay đổi sau khi sửa config

Bạn cần reload config:

```bash
tmux source-file ~/.tmux.conf
```

hoặc:

```text
Ctrl + b, rồi r
```

---

## 12. Gợi ý cấu hình an toàn khi dùng server

Không nên chạy command xóa dữ liệu trong tmux nếu chưa kiểm tra thư mục hiện tại.

Luôn kiểm tra:

```bash
pwd
ls -lh
```

Trước khi chạy các lệnh nguy hiểm như:

```bash
rm -rf ...
find ... -delete
```

---

## 13. Quick start

Chạy nhanh từ đầu:

```bash
sudo apt update
sudo apt install tmux -y
nano ~/.tmux.conf
```

Paste config ở mục 4, lưu file, rồi chạy:

```bash
tmux new -s dev
```

Detach:

```text
Ctrl + b, rồi d
```

Attach lại:

```bash
tmux a -t dev
```
