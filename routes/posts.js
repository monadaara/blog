const fs = require("node:fs");
const validObjectId = require("../middleware/validObjectId");
const validator = require("../middleware/validator");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { validate, Post } = require("../models/post");
const { User } = require("../models/user");
const express = require("express");

const router = express.Router();

router.get("/", async (req, res) => {
  const post = await Post.find();
  res.send(post);
});

router.post(
  "/",
  [upload.single("postImage"), validator(validate)],
  async (req, res) => {
    const user = await User.findById(req.body.userId);

    if (!user) return res.status(404).send("user is not found in the db");
    const postImage = req.file;
    if (!postImage) return res.status(400).send("add image");

    const post = new Post({
      title: req.body.title,
      body: req.body.body,
      tags: req.body.tags,
      user: {
        name: user.name,
        email: user.email,
      },
      postImage: postImage.path,
    });

    const result = await post.save();

    res.send(result);
  }
);

router.put("/:id", [validator(validate), validObjectId], async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    { _id: req.params.id },
    {
      title: req.body.title,
      body: req.body.body,
      tags: req.body.tags,
    },
    { new: true }
  );

  if (!post) return res.status(404).send("user is not found in the db");

  res.send(post);
});

router.delete("/:id", [validObjectId, auth], async (req, res) => {
  const { user } = await Post.findById(req.params.id);

  if (req.user.role === "admin" || req.user.email === user.email) {
    const post = await Post.findByIdAndRemove(req.params.id);
    if (!post) return res.status(404).send("user is not found in the db");

    fs.unlink(`${__dirname}/${post.postImage}`, (err) => {
      if (err) throw err;
    });

    res.send(post);
  } else return res.status(401).send("unauthorised");
});

module.exports = router;
