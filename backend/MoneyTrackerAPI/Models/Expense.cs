namespace MoneyTrackerAPI.Models;

public class Expense
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public ExpenseType Type { get; set; }
    public ExpenseCategory Category { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
