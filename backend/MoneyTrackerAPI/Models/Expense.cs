using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MoneyTrackerAPI.Models;

public class Expense
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("amount")]
    public decimal Amount { get; set; }

    [BsonElement("type")]
    [BsonRepresentation(BsonType.String)]
    public ExpenseType Type { get; set; }

    [BsonElement("category")]
    [BsonRepresentation(BsonType.String)]
    public ExpenseCategory Category { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}