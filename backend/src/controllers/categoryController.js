import prisma from '../db.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { quizzes: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const catId = parseInt(id, 10);

    const category = await prisma.category.findUnique({
      where: { id: catId },
      include: {
        quizzes: {
          where: req.user.role === 'ADMIN' ? {} : { status: 'PUBLISHED' },
          include: {
            _count: {
              select: { questions: true },
            },
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Fetch category detail error:', error);
    res.status(500).json({ message: 'Server error fetching category details' });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existingCat = await prisma.category.findUnique({ where: { name } });
    if (existingCat) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = await prisma.category.create({
      data: { name, description },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ message: 'Server error creating category' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const catId = parseInt(id, 10);

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existingCat = await prisma.category.findFirst({
      where: {
        name,
        NOT: { id: catId },
      },
    });
    if (existingCat) {
      return res.status(400).json({ message: 'Another category with this name already exists' });
    }

    const updatedCat = await prisma.category.update({
      where: { id: catId },
      data: { name, description },
    });

    res.json(updatedCat);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ message: 'Server error updating category' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const catId = parseInt(id, 10);

    await prisma.category.delete({ where: { id: catId } });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error deleting category' });
  }
};
