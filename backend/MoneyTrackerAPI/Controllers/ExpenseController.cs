using Microsoft.AspNetCore.Mvc;

namespace MoneyTrackerAPI.Controllers
{
    public class ExpenseController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
