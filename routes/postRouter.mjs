
import { Router } from "express";
import validatePostData from "../middleware/postValidation.mjs";
import connectionPool from "../utils/db.mjs";


 const postRouter = Router();

 postRouter.get("/", async (req, res) => {
  // ลอจิกในอ่านข้อมูลโพสต์ทั้งหมดในระบบ
  try {
    // 1) Access ข้อมูลใน Body จาก Request ด้วย req.body
    const category = req.query.category || "";
    const keyword = req.query.keyword || "";
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;

    // 2) ทำให้แน่ใจว่า query parameter page และ limit จะมีค่าอย่างต่ำเป็น 1
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const offset = (safePage - 1) * safeLimit;
    // offset คือค่าที่ใช้ในการข้ามจำนวนข้อมูลบางส่วนตอน query ข้อมูลจาก database
    // ถ้า page = 2 และ limit = 6 จะได้ offset = (2 - 1) * 6 = 6 หมายความว่าต้องข้ามแถวไป 6 แถวแรก และดึงแถวที่ 7-12 แทน

    // 3) เขียน Query เพื่อ Insert ข้อมูลโพสต์ ด้วย Connection Pool
    let query = `
    SELECT 
        posts.*, 
        categories.name AS category, 
        statuses.status
    FROM posts
    INNER JOIN categories ON posts.category_id = categories.id
    INNER JOIN statuses ON posts.status_id = statuses.id
    WHERE statuses.id = 2 
  `;
    let values = []; // status id = 2 means showing only publish post

    // 4) เขียน query จากเงื่อนไขของการใส่ query parameter category และ keyword
    if (category && keyword) {
      query += `
          AND categories.name ILIKE $1 
          AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)
        `;
      values = [`%${category}%`, `%${keyword}%`];
    } else if (category) {
      query += " AND categories.name ILIKE $1";
      values = [`%${category}%`];
    } else if (keyword) {
      query += `
          AND (posts.title ILIKE $1 
          OR posts.description ILIKE $1 
          OR posts.content ILIKE $1)
        `;
      values = [`%${keyword}%`];
    }

    // 5) เพิ่มการ odering ตามวันที่, limit และ offset
    query += ` ORDER BY posts.date DESC LIMIT $${values.length + 1} OFFSET $${
      values.length + 2
    }`;

    values.push(safeLimit, offset);

    // 6) Execute the main query (ดึงข้อมูลของบทความ)
    const result = await connectionPool.query(query, values);

    // 7) สร้าง Query สำหรับนับจำนวนทั้งหมดตามเงื่อนไข พื่อใช้สำหรับ pagination metadata
    let countQuery = `
        SELECT COUNT(*)
        FROM posts
        INNER JOIN categories ON posts.category_id = categories.id
        INNER JOIN statuses ON posts.status_id = statuses.id
        WHERE statuses.id = 2 
      `;
    let countValues = values.slice(0, -2); // ลบค่า limit และ offset ออกจาก values

    if (category && keyword) {
      countQuery += `
          AND categories.name ILIKE $1 
          AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)
        `;
    } else if (category) {
      countQuery += " AND categories.name ILIKE $1";
    } else if (keyword) {
      countQuery += `
          AND (posts.title ILIKE $1 
          OR posts.description ILIKE $1 
          OR posts.content ILIKE $1)
        `;
    }

    const countResult = await connectionPool.query(countQuery, countValues);
    const totalPosts = Number(countResult.rows[0].count);

    // 8) สร้าง response พร้อมข้อมูลการแบ่งหน้า (pagination)
    const results = {
      totalPosts,
      totalPages: Math.ceil(totalPosts / safeLimit),
      currentPage: safePage,
      limit: safeLimit,
      posts: result.rows,
    };
    // เช็คว่ามีหน้าถัดไปหรือไม่
    if (offset + safeLimit < totalPosts) {
      results.nextPage = safePage + 1;
    }
    // เช็คว่ามีหน้าก่อนหน้าหรือไม่
    if (offset > 0) {
      results.previousPage = safePage - 1;
    }
    // 9) Return ตัว Response กลับไปหา Client ว่าสร้างสำเร็จ
    return res.status(200).json(results);
  } catch {
    return res.status(500).json({
      message: "Server could not read post because database issue",
    });
  }
});

postRouter.post("/", validatePostData, async (req, res) => {
  const newPost = req.body;

  try {
    const query = `insert into posts (title, image, category_id, description, content, status_id)
      values ($1, $2, $3, $4, $5, $6)`;

    const values = [
      newPost.title,
      newPost.image,
      newPost.category_id,
      newPost.description,
      newPost.content,
      newPost.status_id,
    ];

    await connectionPool.query(query, values);
  } catch (error) {
    return res.status(500).json({
      message: `Server could not create post because database connection`,
      error: error.message,
    });
  }

  return res.status(201).json({ message: "Created post successfully" });
});

postRouter.get("/:postId", async (req, res) => {
  const postId = req.params.postId;
  try {
    const results = await connectionPool.query(
      `
        SELECT posts.id, posts.image, categories.name AS category, posts.title, posts.description, posts.date, posts.content, statuses.status, posts.likes_count
        FROM posts
        INNER JOIN categories ON posts.category_id = categories.id
        INNER JOIN statuses ON posts.status_id = statuses.id
        WHERE posts.id = $1
        `,
      [postId]
    );
    if (!results.rows[0]) {
      return res.status(404).json({
        message: `Server could not find a requested post (post id: ${postId})`,
      });
    }

    return res.status(200).json({
      data: results.rows[0],
    });
  } catch {
    return res.status(500).json({
      message: `Server could not read post because database issue`,
    });
  }
});

postRouter.put("/:postId", validatePostData, async (req, res) => {

    const postId = req.params.postId;
    const updatedPost = { ...req.body, date: new Date() };
  
    try {
      await connectionPool.query(
        `
          UPDATE posts
          SET title = $2,
              image = $3,
              category_id = $4,
              description = $5,
              content = $6,
              status_id = $7,
              date = $8
          WHERE id = $1
        `,
        [
          postId,
          updatedPost.title,
          updatedPost.image,
          updatedPost.category_id,
          updatedPost.description,
          updatedPost.content,
          updatedPost.status_id,
          updatedPost.date,
        ]
      );
  

      return res.status(200).json({
        message: "Updated post successfully",
      });
    } catch {
      return res.status(500).json({
        message: `Server could not update post because database connection`,
      });
    }
  });

  postRouter.delete("/:postId", async (req, res) => {
    const postId = req.params.postId;
  
    try {
      await connectionPool.query(
        `DELETE FROM posts
         WHERE id = $1`,
        [postId]
      );
  
      return res.status(200).json({
        message: "Deleted post successfully",
      });
    } catch {
      return res.status(500).json({
        message: `Server could not delete post because database connection`,
      });
    }
  });

  export default postRouter;