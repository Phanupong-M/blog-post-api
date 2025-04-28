function validatePostData(req, res, next) {
    const { title, image, category_id, description, content, status_id } = req.body

    if (!title) res.status(400).json({ message: "Title is required" })
    if (!image) res.status(400).json({ message: "image is required" })
    if (!category_id) res.status(400).json({ message: "category_id is required" })
    if (!description) res.status(400).json({ message: "description is required" })
    if (!content) res.status(400).json({ message: "content is required" })
    if (!status_id) res.status(400).json({ message: "status_id is required" })
    

    if (typeof title !== "string") res.status(400).json({ message: "Title must be a string" })
    if (typeof image !== "string") res.status(400).json({ message: "image must be a string" })
    if (typeof category_id !== "number") res.status(400).json({ message: "category_id must be a number" })
    if (typeof description !== "string") res.status(400).json({ message: "description must be a string" })
    if (typeof content !== "string") res.status(400).json({ message: "content must be a string" })
    if (typeof status_id !== "number") res.status(400).json({ message: "status_id must be a number" })

    next()
}

export default validatePostData