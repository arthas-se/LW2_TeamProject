using MongoDB.Driver;

namespace MoneyTrackerAPI.Database;

public class MongoDBClient
{
    private static IMongoDatabase _db;
    private static MongoDBClient _instance;
    public static MongoDBClient Instance
    {
        get => _instance ?? new MongoDBClient();
    }
    private MongoDBClient()
    {
        var connectionString = "mongodb+srv://mkoval706_db_user:iLEhsXVMeva1VSTs@lw2.5go2gkx.mongodb.net/";
        var client = new MongoClient(connectionString);
        _db = client.GetDatabase("DataBase");
    }
    public IMongoCollection<T> GetCollection<T>(string name) => _db.GetCollection<T>(name);
}
