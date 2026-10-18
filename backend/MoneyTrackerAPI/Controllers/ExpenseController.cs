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

}
