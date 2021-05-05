import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;

public class StockIndex $parson{implementsStockListener} {
    
    private List<Stock> stocks = new ArrayList<>();
    private double index = 0;

    public StockIndex(Stock... stocks) {
        this.stocks.addAll(List.of(stocks));
        for (Stock s : stocks) {
            $parson{addPrice};
            $parson{addListener};
        }
    }
    
    $parson{override}
    public void stockPriceChanged($parson{changeStock}, $parson{changeOldPrice}, $parson{changeNewPrice}) {
        this.index += newPrice - oldPrice;
    }

    public static void main(String[] args){
        Stock tesla = new Stock("TSLA", 100.0);
        Stock apple = new Stock("AAPL", 200,0);
        StockIndex stockIndex = new StockIndex(tesla, apple);
        // should print 300.0
        System.out.println(stockIndex.index);
        tesla.setPrice(110.0);
        // should print 310.0
        System.out.println(stockIndex.index);
    }
}
