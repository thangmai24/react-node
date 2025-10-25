const express = require('express');
const { body, param } = require('express-validator');
const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
} = require('../controllers/noteController');

const router = express.Router();


// CREATE
router.post(
  '/',
  [
    body('user_id').notEmpty().withMessage('user_id is required'),
    body('translate').optional().isString().withMessage('translate must be string'),
    body('original').optional().isString().withMessage('original must be string'),
    body('image').optional().isString().withMessage('image must be string')
  ],
  createNote
);

// READ ALL
router.post('/show', getNotes);

// READ ONE
router.get('/:id', param('id').isMongoId().withMessage('Invalid note ID'), getNoteById);


// UPDATE
router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid note ID'),
    body('translate').optional().isString().withMessage('translate must be string'),
    body('original').optional().isString().withMessage('original must be string'),
    body('image').optional().isString().withMessage('image must be string')
  ],
  updateNote
);

// DELETE
router.delete('/:id', param('id').isMongoId().withMessage('Invalid note ID'), deleteNote);

module.exports = router;
