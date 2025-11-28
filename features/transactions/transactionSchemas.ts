import { z } from 'zod';

export const transactionSchema = z.object({
    type: z.enum(['expense', 'income']),
    amount: z.number({
        invalid_type_error: "El monto debe ser un número",
    }).positive("El monto debe ser mayor a 0"),
    description: z.string().min(3, "La descripción debe tener al menos 3 caracteres"),
    category: z.string().min(1, "Debes seleccionar una categoría"),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Fecha inválida",
    }),
    isRecurring: z.boolean().optional(),
    recurringDay: z.number().min(1).max(31).optional(),
    paymentMethod: z.enum(['cash', 'credit_card', 'debit_card', 'transfer']).optional(),
    installments: z.number().min(1).optional(),
    firstInstallmentDate: z.string().optional(),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;
