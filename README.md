# SmartMobile Agent - Ecommerce AI Assistant

## Thông tin nhóm

**Thành viên:**

- **Nguyễn Minh Hoàng (Trưởng nhóm)** - 23635051  
- **Lê Đức Hòa** - 23632141  
- **Trương Đặng Hoàng Tuyến** - 23737251  
- **Nguyễn Minh Huy** - 23635041  


# Giới thiệu dự án

**SmartMobile Agent** là một website thương mại điện tử thông minh chuyên về **smartphone**, cho phép người dùng tìm kiếm, so sánh và nhận tư vấn thiết bị phù hợp thông qua **AI Agent**.

Hệ thống sử dụng kiến trúc **RAG (Retrieval-Augmented Generation)** để truy xuất dữ liệu sản phẩm và cung cấp phản hồi chính xác dựa trên thông tin thực tế trong cơ sở dữ liệu.

---

# Mục tiêu dự án

Dự án được xây dựng nhằm:

- Giúp người dùng **tìm kiếm và so sánh smartphone dễ dàng hơn**
- Cung cấp **tư vấn thông minh thông qua AI Agent**
- Phân tích **đánh giá người dùng thực tế** để đưa ra insight khách quan

Thay vì chỉ xem thông số kỹ thuật, người dùng có thể hiểu rõ hơn về **trải nghiệm thực tế của sản phẩm**.

---

# Điểm khác biệt

SmartMobile Agent kết hợp:

- **AI Product Advisor :** Chatbot tư vấn sản phẩm dựa trên dữ liệu thực tế.

- **RAG Architecture :** AI truy xuất dữ liệu từ **Vector Database** để trả lời chính xác.

- **Sentiment Analysis :**  Phân tích đánh giá người dùng để tóm tắt **Ưu điểm – Nhược điểm** của sản phẩm.

Nhờ đó hệ thống có thể đưa ra **gợi ý khách quan và hỗ trợ quyết định mua sắm tốt hơn** so với các website thương mại điện tử truyền thống.

---

# 🚀 Tổng quan hệ thống

SmartMobile Agent được xây dựng với mục tiêu trở thành một nền tảng thương mại điện tử thông minh dựa trên dữ liệu và AI, kết hợp:

- **Frontend:** React + TailwindCSS  
- **Backend:** FastAPI / NodeJS  
- **Database:** PostgreSQL + Vector Database  
- **AI Layer:** RAG, Embedding, Sentiment Analysis  
- **DevOps:** Docker, CI/CD, Cloud Deploy  

---

# 🧠 Kiến trúc AI (RAG Workflow)

```mermaid
flowchart LR
    A[Người dùng đặt câu hỏi] --> B[Tạo Embedding]
    B --> C[Vector Search]
    C --> D[Truy vấn dữ liệu sản phẩm]
    D --> E[LLM tổng hợp câu trả lời]
    E --> F[Phản hồi cho người dùng]
