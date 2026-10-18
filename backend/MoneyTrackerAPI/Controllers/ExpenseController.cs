using Microsoft.AspNetCore.Mvc;
using MoneyTrackerAPI.Database;
using MoneyTrackerAPI.Models;
using MongoDB.Driver;

namespace MoneyTrackerAPI.Controllers;

[ApiController]
[Route("api/expenses")]
public class ExpenseController : Controller
{
    private readonly IMongoCollection<Expense> _expensesCollection;

    public ExpenseController(MongoDBClient mongoClient)
    {
        _expensesCollection = mongoClient.GetCollection<Expense>("Expenses");
    }

    public async Task<ActionResult<List<Expense>>> GetAll()
    {
        var expenses = await _expensesCollection.Find(_ => true).ToListAsync();
        return Ok(expenses);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Expense>> GetById(string id)
    {
        var expense = await _expensesCollection.Find(x => x.Id == id).FirstOrDefaultAsync();

        if (expense is null)
        {
            return NotFound($"Expense with ID '{id}' not found!");
        }

        return Ok(expense);
    }

    [HttpPost]
    public async Task<ActionResult<Expense>> Post([FromBody] Expense newExpense)
    {
        newExpense.Id = string.Empty;

        await _expensesCollection.InsertOneAsync(newExpense);

        return CreatedAtAction(nameof(GetById), new { id = newExpense.Id }, newExpense);
    }
}
