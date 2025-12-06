// Backend/Models/BoatOutRequest.js
module.exports = (sequelize, DataTypes) => {
  const BoatOutRequest = sequelize.define("BoatOutRequest", {
    RQID: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // powiązanie z łodzią
    BID: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // powiązanie z sezonem (opcjonalne, ale fajnie mieć)
    seasonID: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // kto wysłał (Client) – UID z tabeli User
    requestedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // kto zatwierdził/odrzucił (Admin/Employee)
    handledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // typ wyjścia:
    // "Launch"  – wodowanie, trzeba załatwiać w porcie, limit dzienny
    // "Trailer" – klient przyjeżdża z przyczepą (bardziej luźno)
    type: {
      type: DataTypes.ENUM("Launch", "Trailer"),
      allowNull: false,
    },

    // tydzień preferowany przez klienta
    preferredWeekStart: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    preferredWeekEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // status workflow:
    //  - Pending   – klient zgłosił, admin jeszcze nie podjął decyzji
    //  - Accepted  – admin wybrał konkretny dzień i ustawił Boats.out
    //  - Rejected  – odrzucone, np. brak miejsca w tym tygodniu
    //  - Cancelled – klient anulował zanim admin zatwierdził
    status: {
      type: DataTypes.ENUM("Pending", "Accepted", "Rejected", "Cancelled"),
      allowNull: false,
      defaultValue: "Pending",
    },

    // konkretny dzień wyjścia wybrany przez admina
    confirmedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // opis klienta
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // powód odrzucenia przez admina
    rejectReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: "boat_out_requests",
    timestamps: true,
  });

  return BoatOutRequest;
};
